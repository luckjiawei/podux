package monitoring

import (
	"encoding/json"
	"fmt"
	"frpc-hub/pkg/utils"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

// MonitorService is the background network monitoring service.
type MonitorService struct {
	app            core.App
	networkService *NetworkService
	stopChan       chan bool
	latencyTicker  *time.Ticker
	geoTicker      *time.Ticker
}

// NewMonitorService creates a new network monitoring service.
func NewMonitorService(app core.App, networkService *NetworkService) *MonitorService {
	return &MonitorService{
		app:            app,
		networkService: networkService,
		stopChan:       make(chan bool),
	}
}

// Start begins background monitoring.
// latencyInterval: how often to check latency (e.g., 30s).
// geoInterval: how often to check geolocation (e.g., 24h).
func (s *MonitorService) Start(latencyInterval, geoInterval time.Duration) {
	s.app.Logger().Info("Starting network monitor service",
		"latencyInterval", latencyInterval,
		"geoInterval", geoInterval)

	// Execute immediately once
	go s.updateAllServersLatency()
	go s.updateAllServersGeoLocation()

	s.latencyTicker = time.NewTicker(latencyInterval)
	go func() {
		for {
			select {
			case <-s.latencyTicker.C:
				s.updateAllServersLatency()
			case <-s.stopChan:
				return
			}
		}
	}()

	s.geoTicker = time.NewTicker(geoInterval)
	go func() {
		for {
			select {
			case <-s.geoTicker.C:
				s.updateAllServersGeoLocation()
			case <-s.stopChan:
				return
			}
		}
	}()

	s.app.Logger().Info("Network monitor service started successfully")
}

// Stop halts the background monitoring task.
func (s *MonitorService) Stop() {
	if s.latencyTicker != nil {
		s.latencyTicker.Stop()
	}
	if s.geoTicker != nil {
		s.geoTicker.Stop()
	}
	close(s.stopChan)
}

// updateAllServersLatency updates latency for all servers.
func (s *MonitorService) updateAllServersLatency() {
	s.app.Logger().Debug("Updating latency for all servers")

	records, err := s.app.FindRecordsByFilter(
		"fh_servers",
		"",
		"-created",
		500,
		0,
	)
	if err != nil {
		s.app.Logger().Error("Failed to fetch servers for latency monitoring", "error", err)
		return
	}

	s.app.Logger().Debug("Found servers to check latency", "count", len(records))

	for _, record := range records {
		go s.updateServerLatency(record.Id, record.GetString("serverAddr"), record.GetInt("serverPort"))
	}
}

// updateAllServersGeoLocation updates geolocation for servers without geo data.
func (s *MonitorService) updateAllServersGeoLocation() {
	s.app.Logger().Info("Updating geolocation for servers without geo data")

	records, err := s.app.FindRecordsByFilter(
		"fh_servers",
		"geoLocation = '' || geoLocation = null",
		"-created",
		500,
		0,
	)
	if err != nil {
		s.app.Logger().Error("Failed to fetch servers for geo monitoring", "error", err)
		return
	}

	if len(records) == 0 {
		s.app.Logger().Debug("All servers already have geolocation data")
		return
	}

	s.app.Logger().Info("Found servers needing geolocation", "count", len(records))

	for _, record := range records {
		go s.updateServerGeoLocation(record.Id, record.GetString("serverAddr"))
	}
}

// updateServerLatency updates latency for a single server.
func (s *MonitorService) updateServerLatency(serverID string, serverAddr string, serverPort int) {
	addr := fmt.Sprintf("%s:%d", serverAddr, serverPort)
	pingResult := utils.PingHost(addr, 5*time.Second)

	networkStatus := map[string]interface{}{
		"latency":       pingResult.Latency,
		"reachable":     pingResult.Reachable,
		"lastCheckTime": time.Now().Format(time.RFC3339),
		"error":         pingResult.Error,
	}

	networkStatusJSON, _ := json.Marshal(networkStatus)

	_, err := s.app.DB().
		Update("fh_servers",
			dbx.Params{"networkStatus": string(networkStatusJSON)},
			dbx.HashExp{"id": serverID},
		).Execute()

	if err != nil {
		s.app.Logger().Error("Failed to update server latency", "serverId", serverID, "error", err)
		return
	}

	s.app.Logger().Debug("Updated latency",
		"serverId", serverID,
		"addr", serverAddr,
		"latency", pingResult.Latency,
		"reachable", pingResult.Reachable,
	)
}

// updateServerGeoLocation updates geolocation for a single server.
func (s *MonitorService) updateServerGeoLocation(serverID string, serverAddr string) {
	location, err := s.networkService.getGeoLocationWithCache(serverAddr)
	if err != nil {
		s.app.Logger().Warn("Failed to get geo location", "serverId", serverID, "addr", serverAddr, "error", err)
		return
	}

	geoLocation := map[string]interface{}{
		"country":     location.Country,
		"countryCode": location.CountryCode,
		"region":      location.Region,
		"city":        location.City,
		"isp":         location.ISP,
		"lat":         location.Latitude,
		"lon":         location.Longitude,
	}

	geoLocationJSON, _ := json.Marshal(geoLocation)

	_, err = s.app.DB().
		Update("fh_servers",
			dbx.Params{"geoLocation": string(geoLocationJSON)},
			dbx.HashExp{"id": serverID},
		).Execute()

	if err != nil {
		s.app.Logger().Error("Failed to update server geolocation", "serverId", serverID, "error", err)
		return
	}

	s.app.Logger().Info("Updated geolocation",
		"serverId", serverID,
		"addr", serverAddr,
		"city", location.City,
		"isp", location.ISP,
	)
}
