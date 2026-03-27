// Package cloudflare manages cloudflared daemon processes, one per integration.
// It implements tunnel.Provider.
package cloudflare

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"

	"podux/internal/application/integration"
	"podux/internal/application/tunnel"
	proxydomain "podux/internal/domain/proxy"
	tunneldomain "podux/internal/domain/tunnel"
	"podux/pkg/binary"

	"github.com/pocketbase/pocketbase/core"
)

// Provider manages cloudflared tunnel daemon processes, one per integration.
// It implements tunnel.Provider.
type Provider struct {
	app        core.App
	proxyRepo  proxydomain.Repository
	tunnelRepo tunneldomain.Repository
	mu         sync.RWMutex
	processes  map[string]*os.Process
	cancelFns  map[string]context.CancelFunc
}

func NewProvider(app core.App, proxyRepo proxydomain.Repository, tunnelRepo tunneldomain.Repository) *Provider {
	return &Provider{
		app:        app,
		proxyRepo:  proxyRepo,
		tunnelRepo: tunnelRepo,
		processes:  make(map[string]*os.Process),
		cancelFns:  make(map[string]context.CancelFunc),
	}
}

func (p *Provider) logDir(id string) string {
	return filepath.Join("pb_data", "cloudflare", id)
}

func (p *Provider) logPath(id string) string {
	return filepath.Join(p.logDir(id), "cloudflared.log")
}

// Launch starts cloudflared for the given integration ID. Implements tunnel.Provider.
func (p *Provider) Launch(id string) error {
	if p.IsRunning(id) {
		return fmt.Errorf("cloudflared already running for integration %s", id)
	}

	p.app.Logger().Info("launching cloudflared", "integrationId", id)

	// 1. Load integration record and tunnel token from metadata.
	record, err := p.app.FindRecordById("fh_integrations", id)
	if err != nil {
		return fmt.Errorf("find integration: %w", err)
	}

	var meta integration.IntegrationMeta
	if rawMeta := record.Get("metadata"); rawMeta != nil {
		b, _ := json.Marshal(rawMeta)
		_ = json.Unmarshal(b, &meta)
	}
	if meta.Tunnel == nil || meta.Tunnel.Token == "" {
		return fmt.Errorf("integration %s has no tunnel token; create a cloudflare proxy first", id)
	}
	token := meta.Tunnel.Token

	// 2. Ensure cloudflared binary is installed.
	binDir, err := binary.DefaultBinDir()
	if err != nil {
		return fmt.Errorf("resolve bin dir: %w", err)
	}
	mgr := binary.New("cloudflared", "latest", binDir)
	installCtx, installCancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer installCancel()
	if err := mgr.EnsureInstalled(installCtx); err != nil {
		return fmt.Errorf("install cloudflared: %w", err)
	}

	// 3. Prepare log file.
	if err := os.MkdirAll(p.logDir(id), 0755); err != nil {
		return fmt.Errorf("create log dir: %w", err)
	}
	logFile, err := os.OpenFile(p.logPath(id), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("open log file: %w", err)
	}

	// 4. Start cloudflared process.
	runCtx, runCancel := context.WithCancel(context.Background())
	cmd := exec.CommandContext(runCtx, mgr.GetPath(), "tunnel", "--no-autoupdate", "run", "--token", token)
	cmd.Stdout = logFile
	cmd.Stderr = logFile

	if err := cmd.Start(); err != nil {
		runCancel()
		logFile.Close()
		return fmt.Errorf("start cloudflared: %w", err)
	}

	p.mu.Lock()
	p.processes[id] = cmd.Process
	p.cancelFns[id] = runCancel
	p.mu.Unlock()

	p.app.Logger().Info("cloudflared started", "integrationId", id, "pid", cmd.Process.Pid)

	// 5. Monitor process exit and update statuses.
	go func() {
		defer logFile.Close()
		if err := cmd.Wait(); err != nil && runCtx.Err() == nil {
			p.app.Logger().Error("cloudflared exited unexpectedly", "integrationId", id, "error", err)
		} else {
			p.app.Logger().Info("cloudflared stopped", "integrationId", id)
		}
		p.cleanup(id)
	}()

	// Mark tunnel active and proxies online after a brief startup window.
	go func() {
		time.Sleep(3 * time.Second)
		if p.IsRunning(id) {
			p.tunnelRepo.UpdateStatusByIntegrationID(id, tunneldomain.TunnelStatusActive)
			p.proxyRepo.UpdateBootStatusByIntegrationID(id, proxydomain.ProxyBootStatusOnline)
		}
	}()

	return nil
}

// Terminate stops the cloudflared process for the given integration ID. Implements tunnel.Provider.
func (p *Provider) Terminate(id string) error {
	p.app.Logger().Info("terminating cloudflared", "integrationId", id)

	p.mu.RLock()
	cancel, exists := p.cancelFns[id]
	p.mu.RUnlock()
	if !exists {
		return nil
	}

	cancel()
	p.app.Logger().Info("cloudflared stop signal sent", "integrationId", id)
	return nil
}

// Reload is a no-op for cloudflared: tunnels with config_src=cloudflare
// automatically poll for ingress changes from the Cloudflare API.
// Implements tunnel.Provider.
func (p *Provider) Reload(id string) error {
	p.app.Logger().Debug("cloudflare tunnel reload is a no-op (cloudflare-managed config)", "integrationId", id)
	return nil
}

// IsRunning reports whether cloudflared is running for the given integration. Implements tunnel.Provider.
func (p *Provider) IsRunning(id string) bool {
	p.mu.RLock()
	_, exists := p.processes[id]
	p.mu.RUnlock()
	return exists
}

// AutoStart starts cloudflared for all active integrations that have a tunnel token.
// Implements tunnel.Provider.
func (p *Provider) AutoStart() {
	p.app.Logger().Info("waiting 10s before auto-starting cloudflare tunnels")
	time.Sleep(10 * time.Second)

	records, err := p.app.FindRecordsByFilter(
		"fh_integrations",
		`integrationsType = "cloudflare" && status = "active"`,
		"-created", 0, 0, nil,
	)
	if err != nil {
		p.app.Logger().Error("cloudflare auto-start: failed to list integrations", "error", err)
		return
	}

	count := 0
	for _, record := range records {
		var meta integration.IntegrationMeta
		if rawMeta := record.Get("metadata"); rawMeta != nil {
			b, _ := json.Marshal(rawMeta)
			_ = json.Unmarshal(b, &meta)
		}
		if meta.Tunnel == nil || meta.Tunnel.Token == "" {
			continue
		}

		integrationId := record.Id
		p.app.Logger().Info("auto-starting cloudflare tunnel", "integrationId", integrationId)

		go func(id string, delay int) {
			time.Sleep(time.Duration(delay) * 500 * time.Millisecond)
			if err := p.Launch(id); err != nil {
				p.app.Logger().Error("cloudflare auto-start failed", "integrationId", id, "error", err)
			}
		}(integrationId, count)

		count++
		time.Sleep(1 * time.Second)
	}

	p.app.Logger().Info("cloudflare auto-start initiated", "count", count)
}

// StreamLog streams the cloudflared log file via SSE. Implements tunnel.Provider.
func (p *Provider) StreamLog(id string, ctx context.Context, w http.ResponseWriter, flusher http.Flusher) {
	tunnel.StreamLogFile(ctx, w, flusher, p.logPath(id), 50)
}

func (p *Provider) cleanup(id string) {
	p.mu.Lock()
	delete(p.processes, id)
	delete(p.cancelFns, id)
	p.mu.Unlock()
	p.tunnelRepo.UpdateStatusByIntegrationID(id, tunneldomain.TunnelStatusInactive)
	p.proxyRepo.UpdateBootStatusByIntegrationID(id, proxydomain.ProxyBootStatusOffline)
}
