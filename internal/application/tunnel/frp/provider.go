// Package frp manages frp client processes, one per server.
// It implements tunnel.Provider.
package frp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"regexp"
	"sync"
	"syscall"
	"time"

	"podux/internal/application/tunnel"
	proxydomain "podux/internal/domain/proxy"
	serverdomain "podux/internal/domain/server"
	tunneldomain "podux/internal/domain/tunnel"

	"github.com/fatedier/frp/client"
	frpcsource "github.com/fatedier/frp/pkg/config/source"
	v1 "github.com/fatedier/frp/pkg/config/v1"
	"github.com/fatedier/frp/pkg/util/log"
	"github.com/pocketbase/pocketbase/core"
)

var validServerID = regexp.MustCompile(`^[a-z0-9]{15}$`)
var sensitiveRegex = regexp.MustCompile(`"(?i)(token|password|sk|pwd|secretkey|httpuser|httppwd|oidctoken|oidcclientsecret)":"(?:[^"\\]|\\.)*"`)

// Provider manages frp client processes, one per server. It implements tunnel.Provider.
type Provider struct {
	mu             sync.RWMutex
	app            core.App
	processes      map[string]*client.Service
	statusMonitors map[string]context.CancelFunc
	serverRepo     serverdomain.Repository
	proxyRepo      proxydomain.Repository
	tunnelRepo     tunneldomain.Repository
}

func NewProvider(app core.App, serverRepo serverdomain.Repository, proxyRepo proxydomain.Repository, tunnelRepo tunneldomain.Repository) *Provider {
	return &Provider{
		app:            app,
		processes:      make(map[string]*client.Service),
		statusMonitors: make(map[string]context.CancelFunc),
		serverRepo:     serverRepo,
		proxyRepo:      proxyRepo,
		tunnelRepo:     tunnelRepo,
	}
}

func (p *Provider) genCommonCfgs(id string) (*v1.ClientCommonConfig, error) {
	if !validServerID.MatchString(id) {
		return nil, errors.New("invalid server id")
	}
	cfg := &v1.ClientCommonConfig{}

	record, err := p.app.FindRecordById("fh_servers", id)
	if err != nil {
		return nil, err
	}
	cfg.ServerAddr = record.GetString("serverAddr")
	cfg.ServerPort = record.GetInt("serverPort")
	cfg.User = record.GetString("user")

	logDirPath := filepath.Join("pb_data", "frpc", id)
	if err := os.MkdirAll(logDirPath, 0755); err != nil {
		return nil, err
	}

	logStr := record.GetString("log")
	mainPath := p.mainPath(id)
	var logConfig v1.LogConfig
	if err = json.Unmarshal([]byte(logStr), &logConfig); err != nil {
		return nil, err
	}
	logPath := filepath.Join(mainPath, "logs", "frpc.log")
	logConfig.To = logPath
	cfg.Log = logConfig

	authStr := record.GetString("auth")
	var authConfig v1.AuthClientConfig
	if err = json.Unmarshal([]byte(authStr), &authConfig); err != nil {
		return nil, err
	}
	if authConfig.Method != "none" && authConfig.Method != "" {
		cfg.Auth = authConfig
	}

	transportStr := record.GetString("transport")
	var transportConfig v1.ClientTransportConfig
	if err = json.Unmarshal([]byte(transportStr), &transportConfig); err != nil {
		return nil, err
	}
	cfg.Transport = transportConfig
	if *cfg.Transport.TLS.Enable {
		certsDir := filepath.Join(mainPath, "certs")
		hasCert := cfg.Transport.TLS.CertFile != "" && cfg.Transport.TLS.KeyFile != ""
		hasCa := cfg.Transport.TLS.TrustedCaFile != ""

		if hasCert || hasCa {
			if err := os.MkdirAll(certsDir, 0700); err != nil {
				return nil, err
			}
		}
		if hasCert {
			tlsCertFile := filepath.Join(certsDir, "cert.pem")
			tlsKeyFile := filepath.Join(certsDir, "key.pem")
			if err := os.WriteFile(tlsCertFile, []byte(cfg.Transport.TLS.CertFile), 0644); err != nil {
				return nil, err
			}
			if err := os.WriteFile(tlsKeyFile, []byte(cfg.Transport.TLS.KeyFile), 0600); err != nil {
				return nil, err
			}
			cfg.Transport.TLS.CertFile = tlsCertFile
			cfg.Transport.TLS.KeyFile = tlsKeyFile
		} else {
			cfg.Transport.TLS.CertFile = ""
			cfg.Transport.TLS.KeyFile = ""
		}
		if hasCa {
			tlsTrustedCaFile := filepath.Join(certsDir, "ca.pem")
			if err := os.WriteFile(tlsTrustedCaFile, []byte(cfg.Transport.TLS.TrustedCaFile), 0644); err != nil {
				return nil, err
			}
			cfg.Transport.TLS.TrustedCaFile = tlsTrustedCaFile
		} else {
			cfg.Transport.TLS.TrustedCaFile = ""
		}
	}

	metadataStr := record.GetString("metadatas")
	var metadataConfig map[string]string
	if err = json.Unmarshal([]byte(metadataStr), &metadataConfig); err != nil {
		return nil, err
	}
	cfg.Metadatas = metadataConfig
	return cfg, nil
}

func (p *Provider) genProxyCfgs(serverId string) ([]v1.ProxyConfigurer, error) {
	proxies, err := p.proxyRepo.FindEnabledByServerID(serverId)
	if err != nil {
		p.app.Logger().Error("genProxyCfgs", "err", err)
		return nil, err
	}

	var proxyCfgs []v1.ProxyConfigurer
	for _, proxyMap := range proxies {
		jsonData, err := json.Marshal(proxyMap)
		if err != nil {
			return nil, err
		}

		var proxyData map[string]interface{}
		if err := json.Unmarshal(jsonData, &proxyData); err != nil {
			return nil, err
		}

		if proxyMap.ProxyType == "http" || proxyMap.ProxyType == "https" {
			delete(proxyData, "remotePort")
		}
		proxyData["name"] = proxyMap.Name + "-" + proxyMap.Id

		if plugin, ok := proxyData["plugin"].(map[string]interface{}); ok {
			if _, hasType := plugin["type"]; !hasType {
				delete(proxyData, "plugin")
			}
		}

		jsonData, err = json.Marshal(proxyData)
		if err != nil {
			return nil, err
		}

		switch proxyMap.ProxyType {
		case "tcp":
			var tcpProxy v1.TCPProxyConfig
			if err := json.Unmarshal(jsonData, &tcpProxy); err != nil {
				return nil, err
			}
			proxyCfgs = append(proxyCfgs, &tcpProxy)
		case "udp":
			var udpProxy v1.UDPProxyConfig
			if err := json.Unmarshal(jsonData, &udpProxy); err != nil {
				return nil, err
			}
			proxyCfgs = append(proxyCfgs, &udpProxy)
		case "http":
			var httpProxy v1.HTTPProxyConfig
			if err := json.Unmarshal(jsonData, &httpProxy); err != nil {
				return nil, err
			}
			proxyCfgs = append(proxyCfgs, &httpProxy)
		case "https":
			var httpsProxy v1.HTTPSProxyConfig
			if err := json.Unmarshal(jsonData, &httpsProxy); err != nil {
				return nil, err
			}
			proxyCfgs = append(proxyCfgs, &httpsProxy)
		}
	}

	return proxyCfgs, nil
}

func handleTermSignal(svr *client.Service) {
	ch := make(chan os.Signal, 1)
	signal.Notify(ch, syscall.SIGINT, syscall.SIGTERM)
	<-ch
	svr.GracefulClose(500 * time.Millisecond)
}

// Launch starts the frp client for the given server ID. Implements tunnel.Provider.
func (p *Provider) Launch(id string) error {
	p.app.Logger().Info("Launch frpc", "id", id)
	cfg, err := p.genCommonCfgs(id)
	if err != nil {
		return err
	}

	proxyCfgs, err := p.genProxyCfgs(id)
	if err != nil {
		return err
	}

	p.app.Logger().Debug("Config", "serverAddr", cfg.ServerAddr, "serverPort", cfg.ServerPort, "proxyCount", len(proxyCfgs))

	commonCfgBytes, _ := json.Marshal(cfg)
	proxyCfgsBytes, _ := json.Marshal(proxyCfgs)
	safeCommon := sensitiveRegex.ReplaceAll(commonCfgBytes, []byte(`"${1}":"***"`))
	safeProxies := sensitiveRegex.ReplaceAll(proxyCfgsBytes, []byte(`"${1}":"***"`))
	p.app.Logger().Info("FRP Configuration", "common", string(safeCommon), "proxies", string(safeProxies))

	cfg.Complete()
	log.InitLogger(cfg.Log.To, cfg.Log.Level, int(cfg.Log.MaxDays), cfg.Log.DisablePrintColor)

	configSrc := frpcsource.NewConfigSource()
	if err := configSrc.ReplaceAll(proxyCfgs, nil); err != nil {
		return err
	}
	svr, err := client.NewService(client.ServiceOptions{
		Common:                 cfg,
		ConfigSourceAggregator: frpcsource.NewAggregator(configSrc),
	})
	if err != nil {
		p.app.Logger().Error("NewService", "err", err)
		return err
	}
	if cfg.Transport.Protocol == "kcp" || cfg.Transport.Protocol == "quic" {
		go handleTermSignal(svr)
	}

	ctx, cancel := context.WithCancel(context.Background())
	p.mu.Lock()
	p.processes[id] = svr
	p.statusMonitors[id] = cancel
	p.mu.Unlock()

	done := make(chan error, 1)
	go func() {
		p.app.Logger().Info("Frpc service starting execution", "id", id)
		err := svr.Run(ctx)
		if err != nil {
			p.app.Logger().Error("Frpc service exited with error", "id", id, "error", err)
		} else {
			p.app.Logger().Info("Frpc service exited normally", "id", id)
		}
		done <- err
	}()

	go p.monitorServiceStatus(id, svr, ctx, done)
	return nil
}

func (p *Provider) monitorServiceStatus(id string, svr *client.Service, ctx context.Context, done <-chan error) {
	time.Sleep(2 * time.Second)

	select {
	case err := <-done:
		p.app.Logger().Error("Service exited during startup", "id", id, "error", err)
		p.destroying(id)
		return
	case <-ctx.Done():
		p.app.Logger().Info("Service context cancelled during startup", "id", id)
		p.destroying(id)
		return
	default:
		p.tunnelRepo.UpdateStatusByServerID(id, tunneldomain.TunnelStatusActive)
		p.app.Logger().Info("Service is running", "id", id)
	}

	go p.monitorProxyStatus(id, svr, ctx)

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case err := <-done:
			if err != nil {
				p.app.Logger().Error("Service exited with error", "id", id, "error", err)
			} else {
				p.app.Logger().Info("Service exited normally", "id", id)
			}
			p.destroying(id)
			return
		case <-ctx.Done():
			p.app.Logger().Info("Service stopped by user", "id", id)
			p.destroying(id)
			return
		case <-ticker.C:
			p.app.Logger().Debug("Service status check", "id", id, "status", "running")
		}
	}
}

func (p *Provider) destroying(id string) {
	p.tunnelRepo.UpdateStatusByServerID(id, tunneldomain.TunnelStatusInactive)
	p.proxyRepo.UpdateBootStatusByServerID(id, proxydomain.ProxyBootStatusOffline)
	p.mu.Lock()
	delete(p.processes, id)
	delete(p.statusMonitors, id)
	p.mu.Unlock()
}

func (p *Provider) monitorProxyStatus(serverId string, svr *client.Service, ctx context.Context) {
	p.app.Logger().Info("Starting proxy status monitoring", "serverId", serverId)

	statusExporter := svr.StatusExporter()

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			p.app.Logger().Info("Proxy status monitoring stopped", "serverId", serverId)
			return
		case <-ticker.C:
			proxies, err := p.proxyRepo.FindByServerID(serverId)
			if err != nil {
				p.app.Logger().Error("Failed to get proxies", "serverId", serverId, "error", err)
				continue
			}

			for _, proxy := range proxies {
				baseName := proxy.Name + "-" + proxy.Id
				status, exists := statusExporter.GetProxyStatus(baseName)
				p.app.Logger().Info("proxy status check", "baseName", baseName, "exists", exists, "phase", func() string {
					if status != nil {
						return status.Phase
					}
					return "nil"
				}())

				if exists {
					var bootStatus proxydomain.ProxyBootStatus
					switch status.Phase {
					case "running":
						bootStatus = proxydomain.ProxyBootStatusOnline
					case "start error", "check failed", "closed":
						bootStatus = proxydomain.ProxyBootStatusOffline
					default:
						bootStatus = proxydomain.ProxyBootStatusOffline
					}
					p.proxyRepo.UpdateBootStatus(proxy.Id, bootStatus)
				} else {
					p.proxyRepo.UpdateBootStatus(proxy.Id, proxydomain.ProxyBootStatusOffline)
				}
			}
		}
	}
}

// Terminate stops the frp client for the given server ID. Implements tunnel.Provider.
func (p *Provider) Terminate(id string) error {
	p.app.Logger().Info("Stop frpc", "id", id)

	p.mu.RLock()
	cancel, exists := p.statusMonitors[id]
	p.mu.RUnlock()
	if !exists {
		return nil
	}

	cancel()
	p.app.Logger().Info("Frpc stop signal sent", "id", id)
	return nil
}

// Reload hot-reloads the proxy configuration for the given server. Implements tunnel.Provider.
func (p *Provider) Reload(id string) error {
	p.app.Logger().Info("Reload frpc", "id", id)

	proxyCfgs, err := p.genProxyCfgs(id)
	if err != nil {
		return err
	}

	proxyCfgsBytes, _ := json.Marshal(proxyCfgs)
	safeProxies := sensitiveRegex.ReplaceAll(proxyCfgsBytes, []byte(`"${1}":"***"`))
	p.app.Logger().Info("FRP Reload Configurations", "proxies", string(safeProxies))

	p.mu.RLock()
	svr := p.processes[id]
	p.mu.RUnlock()
	// TODO 2026-02-08 reload visitorCfgs
	svr.UpdateAllConfigurer(proxyCfgs, nil)

	return nil
}

// IsRunning reports whether the frp client for the given server is active. Implements tunnel.Provider.
func (p *Provider) IsRunning(id string) bool {
	p.mu.RLock()
	_, exists := p.processes[id]
	p.mu.RUnlock()
	return exists
}

// AutoStart starts all servers configured with autoConnection=true. Implements tunnel.Provider.
func (p *Provider) AutoStart() {
	p.app.Logger().Info("Auto-starting servers with autoConnection enabled")
	p.app.Logger().Info("Waiting for 10 seconds before auto-starting servers")
	time.Sleep(10 * time.Second)

	records, err := p.serverRepo.FindAllWithAutoConnect()
	if err != nil {
		p.app.Logger().Error("Failed to find auto-connection servers", "error", err)
		return
	}

	count := 0
	for _, record := range records {
		serverId := record.ID
		serverName := record.ServerName

		p.app.Logger().Info("Auto-starting server", "id", serverId, "name", serverName)

		go func(id string, delay int) {
			time.Sleep(time.Duration(delay) * 500 * time.Millisecond)
			if err := p.Launch(id); err != nil {
				p.app.Logger().Error("Failed to auto-start server", "id", id, "error", err)
			} else {
				p.app.Logger().Info("Successfully auto-started server", "id", id)
			}
		}(serverId, count)

		count++
		p.app.Logger().Info("Waiting for 1s before auto-starting next server")
		time.Sleep(1 * time.Second)
	}

	p.app.Logger().Info("Auto-start initiated for servers", "count", count)
}

// StreamLog streams the frpc log file via SSE. Implements tunnel.Provider.
func (p *Provider) StreamLog(id string, ctx context.Context, w http.ResponseWriter, flusher http.Flusher) {
	if !validServerID.MatchString(id) {
		fmt.Fprintf(w, "data: [invalid server id]\n\n")
		flusher.Flush()
		return
	}
	logPath := filepath.Join(p.mainPath(id), "logs", "frpc.log")
	tunnel.StreamLogFile(ctx, w, flusher, logPath, 50)
}

func (p *Provider) mainPath(id string) string {
	return filepath.Join("pb_data", "frpc", id)
}

