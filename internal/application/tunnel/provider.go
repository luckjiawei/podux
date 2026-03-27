// Package tunnel defines the common Provider interface implemented by all
// tunnel backends (frpc, cloudflare).
package tunnel

import (
	"context"
	"net/http"
)

// Provider defines the lifecycle interface for a tunnel backend.
// Each implementation manages a set of running tunnel processes,
// keyed by an entity ID (serverId for frpc, integrationId for cloudflare).
type Provider interface {
	// Launch starts the tunnel for the given entity ID.
	Launch(id string) error
	// Terminate stops the tunnel for the given entity ID.
	Terminate(id string) error
	// Reload reloads the proxy configuration without a full restart.
	Reload(id string) error
	// IsRunning reports whether the tunnel for the given entity is active.
	IsRunning(id string) bool
	// AutoStart starts all tunnels configured for automatic connection.
	AutoStart()
	// StreamLog tails the tunnel log via Server-Sent Events.
	StreamLog(id string, ctx context.Context, w http.ResponseWriter, flusher http.Flusher)
}
