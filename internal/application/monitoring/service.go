package monitoring

import (
	"fmt"
	"frpc-hub/pkg/utils"
	"sync"
	"time"

	"github.com/pocketbase/pocketbase/core"
)

// NetworkService is the network diagnostic service.
type NetworkService struct {
	app          core.App
	geoCache     map[string]*geoCacheItem // IP geolocation cache
	geoCacheLock sync.RWMutex             // Cache read-write lock
}

// geoCacheItem is a geolocation cache entry.
type geoCacheItem struct {
	Location  *utils.GeoLocation
	ExpiresAt time.Time
}

// ServerNetworkStatus holds network status for a server.
type ServerNetworkStatus struct {
	ServerID      string             `json:"serverId"`
	ServerName    string             `json:"serverName"`
	ServerAddr    string             `json:"serverAddr"`
	ServerPort    int                `json:"serverPort"`
	NetworkStatus *NetworkStatus     `json:"networkStatus"`
	GeoLocation   *utils.GeoLocation `json:"geoLocation,omitempty"`
}

// NetworkStatus holds latency and reachability information.
type NetworkStatus struct {
	Latency       int64     `json:"latency"`       // Latency in milliseconds
	Reachable     bool      `json:"reachable"`     // Whether the host is reachable
	LastCheckTime time.Time `json:"lastCheckTime"` // Last check timestamp
	Error         string    `json:"error,omitempty"`
}

// NewNetworkService creates a new network diagnostic service.
func NewNetworkService(app core.App) *NetworkService {
	return &NetworkService{
		app:      app,
		geoCache: make(map[string]*geoCacheItem),
	}
}

// GetServerNetworkStatus retrieves server network status.
func (s *NetworkService) GetServerNetworkStatus(serverID string) (*ServerNetworkStatus, error) {
	record, err := s.app.FindRecordById("fh_servers", serverID)
	if err != nil {
		return nil, fmt.Errorf("server not found: %w", err)
	}

	serverName := record.GetString("name")
	serverAddr := record.GetString("serverAddr")
	serverPort := record.GetInt("serverPort")

	addr := fmt.Sprintf("%s:%d", serverAddr, serverPort)
	pingResult := utils.PingHost(addr, 5*time.Second)

	networkStatus := &NetworkStatus{
		Latency:       pingResult.Latency,
		Reachable:     pingResult.Reachable,
		LastCheckTime: time.Now(),
		Error:         pingResult.Error,
	}

	geoLocation, err := s.getGeoLocationWithCache(serverAddr)
	if err != nil {
		s.app.Logger().Warn("Failed to get geo location", "addr", serverAddr, "error", err)
	}

	return &ServerNetworkStatus{
		ServerID:      serverID,
		ServerName:    serverName,
		ServerAddr:    serverAddr,
		ServerPort:    serverPort,
		NetworkStatus: networkStatus,
		GeoLocation:   geoLocation,
	}, nil
}

// getGeoLocationWithCache retrieves geolocation information with a 24-hour cache.
func (s *NetworkService) getGeoLocationWithCache(addr string) (*utils.GeoLocation, error) {
	s.geoCacheLock.RLock()
	if item, exists := s.geoCache[addr]; exists {
		if time.Now().Before(item.ExpiresAt) {
			s.geoCacheLock.RUnlock()
			return item.Location, nil
		}
	}
	s.geoCacheLock.RUnlock()

	location, err := utils.GetGeoLocation(addr)
	if err != nil {
		return nil, err
	}

	s.geoCacheLock.Lock()
	s.geoCache[addr] = &geoCacheItem{
		Location:  location,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	s.geoCacheLock.Unlock()

	return location, nil
}

// ClearGeoCache clears the geolocation cache.
func (s *NetworkService) ClearGeoCache() {
	s.geoCacheLock.Lock()
	defer s.geoCacheLock.Unlock()
	s.geoCache = make(map[string]*geoCacheItem)
}

// CleanExpiredCache removes expired entries from the geolocation cache.
func (s *NetworkService) CleanExpiredCache() {
	s.geoCacheLock.Lock()
	defer s.geoCacheLock.Unlock()

	now := time.Now()
	for addr, item := range s.geoCache {
		if now.After(item.ExpiresAt) {
			delete(s.geoCache, addr)
		}
	}
}
