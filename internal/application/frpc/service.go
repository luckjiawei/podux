package frpc

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"regexp"
	"sync"
	"syscall"
	"time"

	proxydomain "frpc-hub/internal/domain/proxy"
	serverdomain "frpc-hub/internal/domain/server"
	"frpc-hub/pkg/utils"

	"github.com/fatedier/frp/client"
	v1 "github.com/fatedier/frp/pkg/config/v1"
	"github.com/fatedier/frp/pkg/util/log"
	"github.com/pocketbase/pocketbase/core"
)

var validServerID = regexp.MustCompile(`^[a-z0-9]{15}$`)
var sensitiveRegex = regexp.MustCompile(`"(?i)(token|password|sk|pwd|secretkey|httpuser|httppwd|oidctoken|oidcclientsecret)":"(?:[^"\\]|\\.)*"`)

type Service struct {
	mu             sync.RWMutex
	app            core.App
	processes      map[string]*client.Service
	statusMonitors map[string]context.CancelFunc
	serverRepo     serverdomain.Repository
	proxyRepo      proxydomain.Repository
}

func NewService(app core.App, serverRepo serverdomain.Repository, proxyRepo proxydomain.Repository) *Service {
	return &Service{
		app:            app,
		processes:      make(map[string]*client.Service),
		statusMonitors: make(map[string]context.CancelFunc),
		serverRepo:     serverRepo,
		proxyRepo:      proxyRepo,
	}
}

func (fs *Service) genCommonCfgs(id *string) (*v1.ClientCommonConfig, error) {
	if !validServerID.MatchString(*id) {
		return nil, errors.New("invalid server id")
	}
	cfg := &v1.ClientCommonConfig{}

	record, err := fs.app.FindRecordById("fh_servers", *id)
	if err != nil {
		return nil, err
	}
	// basic config
	cfg.ServerAddr = record.GetString("serverAddr")
	cfg.ServerPort = record.GetInt("serverPort")
	cfg.User = record.GetString("user")

	logDirPath := filepath.Join("pb_data", "frpc", *id)
	if err := os.MkdirAll(logDirPath, 0755); err != nil {
		return nil, err
	}

	// log config
	logStr := record.GetString("log")
	mainPath := fs.getFrpMainPath(id)
	var logConfig v1.LogConfig
	err = json.Unmarshal([]byte(logStr), &logConfig)
	if err != nil {
		return nil, err
	}
	logPath := filepath.Join(mainPath, "logs", "frpc.log")
	logConfig.To = logPath
	cfg.Log = logConfig

	// auth config
	authStr := record.GetString("auth")
	var authConfig v1.AuthClientConfig
	err = json.Unmarshal([]byte(authStr), &authConfig)
	if err != nil {
		return nil, err
	}
	if authConfig.Method != "none" && authConfig.Method != "" {
		cfg.Auth = authConfig
	}

	// transport config
	transportStr := record.GetString("transport")
	var transportConfig v1.ClientTransportConfig
	err = json.Unmarshal([]byte(transportStr), &transportConfig)
	if err != nil {
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

	// metadata config
	metadataStr := record.GetString("metadatas")
	var metadataConfig map[string]string
	err = json.Unmarshal([]byte(metadataStr), &metadataConfig)
	if err != nil {
		return nil, err
	}
	cfg.Metadatas = metadataConfig
	return cfg, nil
}

func (fs *Service) genProxyCfgs(serverId *string) ([]v1.ProxyConfigurer, error) {
	proxies, err := fs.proxyRepo.FindEnabledByServerID(*serverId)
	if err != nil {
		fs.app.Logger().Error("genProxyCfgs", "err", err)
		return nil, err
	}

	var proxyCfgs []v1.ProxyConfigurer
	for _, proxyMap := range proxies {
		jsonData, err := json.Marshal(proxyMap)
		if err != nil {
			return nil, err
		}

		// Convert to map to manipulate fields
		var proxyData map[string]interface{}
		if err := json.Unmarshal(jsonData, &proxyData); err != nil {
			return nil, err
		}

		if proxyMap.ProxyType == "http" || proxyMap.ProxyType == "https" {
			delete(proxyData, "remotePort")
		}
		proxyData["name"] = proxyMap.Name + "-" + proxyMap.Id

		// Remove empty plugin map so frp doesn't try to parse a typeless plugin
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

func (fs *Service) LaunchFrpc(serverId *string) error {
	fs.app.Logger().Info("Launch frpc", "id", *serverId)
	cfg, err := fs.genCommonCfgs(serverId)
	if err != nil {
		return err
	}

	proxyCfgs, err := fs.genProxyCfgs(serverId)
	if err != nil {
		return err
	}

	fs.app.Logger().Debug("Config", "serverAddr", cfg.ServerAddr, "serverPort", cfg.ServerPort, "proxyCount", len(proxyCfgs))

	for _, c := range proxyCfgs {
		c.Complete(cfg.User)
	}

	// Print frp configurations in logs with sensitive data masked
	commonCfgBytes, _ := json.Marshal(cfg)
	proxyCfgsBytes, _ := json.Marshal(proxyCfgs)

	safeCommon := sensitiveRegex.ReplaceAll(commonCfgBytes, []byte(`"${1}":"***"`))
	safeProxies := sensitiveRegex.ReplaceAll(proxyCfgsBytes, []byte(`"${1}":"***"`))

	fs.app.Logger().Info("FRP Configuration", "common", string(safeCommon), "proxies", string(safeProxies))

	cfg.Complete()
	log.InitLogger(cfg.Log.To, cfg.Log.Level, int(cfg.Log.MaxDays), cfg.Log.DisablePrintColor)

	svr, err := client.NewService(client.ServiceOptions{
		Common:    cfg,
		ProxyCfgs: proxyCfgs,
	})
	if err != nil {
		fs.app.Logger().Error("NewService", "err", err)
		return err
	}
	shouldGracefulClose := cfg.Transport.Protocol == "kcp" || cfg.Transport.Protocol == "quic"
	if shouldGracefulClose {
		go handleTermSignal(svr)
	}
	ctx, cancel := context.WithCancel(context.Background())
	fs.mu.Lock()
	fs.processes[*serverId] = svr
	fs.statusMonitors[*serverId] = cancel
	fs.mu.Unlock()

	fs.serverRepo.UpdateBootStatus(*serverId, serverdomain.ServerStatusRunning)

	done := make(chan error, 1)

	go func() {
		fs.app.Logger().Info("Frpc service starting execution", "id", *serverId)
		err := svr.Run(ctx)
		if err != nil {
			fs.app.Logger().Error("Frpc service exited with error", "id", *serverId, "error", err)
		} else {
			fs.app.Logger().Info("Frpc service exited normally", "id", *serverId)
		}
		done <- err
	}()

	go fs.monitorServiceStatus(serverId, svr, ctx, done, cfg.User)

	return nil
}

// monitorServiceStatus monitors service status and updates the database.
func (fs *Service) monitorServiceStatus(id *string, svr *client.Service, ctx context.Context, done <-chan error, user string) {
	time.Sleep(2 * time.Second)

	select {
	case err := <-done:
		fs.app.Logger().Error("Service exited during startup", "id", *id, "error", err)
		fs.destroying(id)
		return
	case <-ctx.Done():
		fs.app.Logger().Info("Service context cancelled during startup", "id", *id)
		fs.destroying(id)
		return
	default:
		fs.serverRepo.UpdateBootStatus(*id, serverdomain.ServerStatusRunning)
		fs.app.Logger().Info("Service is running", "id", *id)
	}

	go fs.monitorProxyStatus(id, svr, ctx, user)

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case err := <-done:
			if err != nil {
				fs.app.Logger().Error("Service exited with error", "id", *id, "error", err)
			} else {
				fs.app.Logger().Info("Service exited normally", "id", *id)
			}
			fs.destroying(id)
			return
		case <-ctx.Done():
			fs.app.Logger().Info("Service stopped by user", "id", *id)
			fs.destroying(id)
			return
		case <-ticker.C:
			fs.app.Logger().Debug("Service status check", "id", *id, "status", "running")
		}
	}
}

func (fs *Service) destroying(id *string) {
	fs.serverRepo.UpdateBootStatus(*id, serverdomain.ServerStatusStopped)
	fs.proxyRepo.UpdateBootStatusByServerID(*id, proxydomain.ProxyBootStatusOffline)
	fs.mu.Lock()
	delete(fs.processes, *id)
	delete(fs.statusMonitors, *id)
	fs.mu.Unlock()
}

// monitorProxyStatus monitors proxy status from frp and updates the database.
func (fs *Service) monitorProxyStatus(serverId *string, svr *client.Service, ctx context.Context, user string) {
	fs.app.Logger().Info("Starting proxy status monitoring", "serverId", *serverId)

	statusExporter := svr.StatusExporter()

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			fs.app.Logger().Info("Proxy status monitoring stopped", "serverId", *serverId)
			return
		case <-ticker.C:
			proxies, err := fs.proxyRepo.FindByServerID(*serverId)
			if err != nil {
				fs.app.Logger().Error("Failed to get proxies", "serverId", *serverId, "error", err)
				continue
			}

			for _, proxy := range proxies {
				baseName := proxy.Name + "-" + proxy.Id
				prefix := ""
				if user != "" {
					prefix = user + "."
				}
				status, exists := statusExporter.GetProxyStatus(prefix + baseName)

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
					fs.proxyRepo.UpdateBootStatus(proxy.Id, bootStatus)
				} else {
					// Proxy is not in frp (disabled or removed) — mark as offline
					fs.proxyRepo.UpdateBootStatus(proxy.Id, proxydomain.ProxyBootStatusOffline)
				}
			}
		}
	}
}

// TerminateFrpc stops the specified frpc service.
func (fs *Service) TerminateFrpc(id *string) error {
	fs.app.Logger().Info("Stop frpc", "id", *id)

	fs.mu.RLock()
	cancel, exists := fs.statusMonitors[*id]
	fs.mu.RUnlock()
	if !exists {
		return nil
	}

	cancel()

	fs.app.Logger().Info("Frpc stop signal sent", "id", *id)
	return nil
}

func (fs *Service) getFrpMainPath(id *string) string {
	return filepath.Join("pb_data", "frpc", *id)
}

// StreamLog streams the frpc log file via SSE.
// It sends the last 50 lines as initial content, then tails new lines every 500ms.
func (fs *Service) StreamLog(serverId string, ctx context.Context, w http.ResponseWriter, flusher http.Flusher) {
	if !validServerID.MatchString(serverId) {
		fmt.Fprintf(w, "data: [invalid server id]\n\n")
		flusher.Flush()
		return
	}
	mainPath := fs.getFrpMainPath(&serverId)
	logPath := filepath.Join(mainPath, "logs", "frpc.log")

	file, err := os.Open(logPath)
	if err != nil {
		fs.app.Logger().Warn("Log file not found", "serverId", serverId, "path", logPath, "error", err)
		fmt.Fprintf(w, "data: [No log file found]\n\n")
		flusher.Flush()
		return
	}
	defer file.Close()

	initialLines := utils.ReadLastNLines(file, 50)
	fs.app.Logger().Info("Streaming log file", "serverId", serverId, "initialLines", len(initialLines))
	for _, line := range initialLines {
		fmt.Fprintf(w, "data: %s\n\n", line)
	}
	flusher.Flush()

	offset, err := file.Seek(0, io.SeekEnd)
	if err != nil {
		return
	}

	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			fi, err := os.Stat(logPath)
			if err != nil {
				continue
			}

			if fi.Size() < offset {
				file.Close()
				file, err = os.Open(logPath)
				if err != nil {
					continue
				}
				offset = 0
			}

			file.Seek(offset, io.SeekStart)
			scanner := bufio.NewScanner(file)
			hasData := false
			for scanner.Scan() {
				line := scanner.Text()
				if line != "" {
					fmt.Fprintf(w, "data: %s\n\n", line)
					hasData = true
				}
			}
			newOffset, _ := file.Seek(0, io.SeekCurrent)
			offset = newOffset

			if hasData {
				flusher.Flush()
			}
		}
	}
}

func (fs *Service) ReloadFrpc(serverId *string) error {
	fs.app.Logger().Info("Reload frpc", "id", *serverId)

	proxyCfgs, err := fs.genProxyCfgs(serverId)
	if err != nil {
		return err
	}

	server, err := fs.app.FindRecordById("fh_servers", *serverId)
	if err != nil {
		return err
	}
	user := server.GetString("user")
	for _, c := range proxyCfgs {
		c.Complete(user)
	}

	proxyCfgsBytes, _ := json.Marshal(proxyCfgs)
	safeProxies := sensitiveRegex.ReplaceAll(proxyCfgsBytes, []byte(`"${1}":"***"`))
	fs.app.Logger().Info("FRP Reload Configurations", "proxies", string(safeProxies))

	fs.mu.RLock()
	svr := fs.processes[*serverId]
	fs.mu.RUnlock()
	// TODO 2026-02-08 reload visitorCfgs
	svr.UpdateAllConfigurer(proxyCfgs, nil)

	return nil
}

// IsServerRunning checks if a server is currently running.
func (fs *Service) IsServerRunning(serverId string) bool {
	fs.mu.RLock()
	_, exists := fs.processes[serverId]
	fs.mu.RUnlock()
	return exists
}

// AutoStartServers automatically starts all servers with autoConnection=true.
func (fs *Service) AutoStartServers() {
	fs.app.Logger().Info("Auto-starting servers with autoConnection enabled")
	fs.app.Logger().Info("Waiting for 10 seconds before auto-starting servers")
	time.Sleep(10 * time.Second)

	records, err := fs.serverRepo.FindAllWithAutoConnect()
	if err != nil {
		fs.app.Logger().Error("Failed to find auto-connection servers", "error", err)
		return
	}

	count := 0
	for _, record := range records {
		serverId := record.ID
		serverName := record.ServerName

		fs.app.Logger().Info("Auto-starting server", "id", serverId, "name", serverName)

		go func(id string) {
			time.Sleep(time.Duration(count) * 500 * time.Millisecond)

			if err := fs.LaunchFrpc(&id); err != nil {
				fs.app.Logger().Error("Failed to auto-start server", "id", id, "error", err)
			} else {
				fs.app.Logger().Info("Successfully auto-started server", "id", id)
			}
		}(serverId)

		count++
		fs.app.Logger().Info("Waiting for 1s before auto-starting next server")
		time.Sleep(1 * time.Second)
	}

	fs.app.Logger().Info("Auto-start initiated for servers", "count", count)
}
