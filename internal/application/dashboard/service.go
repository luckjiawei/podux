package dashboard

import (
	proxyapp "frpc-hub/internal/application/proxy"
	serverapp "frpc-hub/internal/application/server"
	proxydomain "frpc-hub/internal/domain/proxy"
	serverdomain "frpc-hub/internal/domain/server"
	"time"

	"github.com/pocketbase/pocketbase/core"
)

type DashboardStats struct {
	RunningCount         int64
	StoppedCount         int64
	ProxiesEnabledCount  int64
	ProxiesDisabledCount int64
	ProxiesOnlineCount   int64
	MaxLatency           int64
	ProxyTypeCounts      map[string]int64
	UptimeSeconds        int64
}

type TopologyServerItem struct {
	ID         string `json:"id" db:"id"`
	ServerName string `json:"serverName" db:"serverName"`
	ServerAddr string `json:"serverAddr" db:"serverAddr"`
	BootStatus string `json:"bootStatus" db:"bootStatus"`
}

type TopologyProxyItem struct {
	ID         string `json:"id" db:"id"`
	Name       string `json:"name" db:"name"`
	ProxyType  string `json:"proxyType" db:"proxyType"`
	LocalIP    string `json:"localIP" db:"localIP"`
	LocalPort  string `json:"localPort" db:"localPort"`
	RemotePort string `json:"remotePort" db:"remotePort"`
	Status     string `json:"status" db:"status"`
	BootStatus string `json:"bootStatus" db:"bootStatus"`
	ServerID   string `json:"serverId" db:"serverId"`
}

type TopologyData struct {
	Servers []TopologyServerItem `json:"servers"`
	Proxies []TopologyProxyItem  `json:"proxies"`
}

type Service struct {
	app           core.App
	serverService *serverapp.Service
	proxyService  *proxyapp.Service
	startTime     time.Time
}

func NewService(app core.App, serverService *serverapp.Service, proxyService *proxyapp.Service) *Service {
	return &Service{
		app:           app,
		serverService: serverService,
		proxyService:  proxyService,
		startTime:     time.Now(),
	}
}

func (s *Service) GetStats() (*DashboardStats, error) {
	runningCount, err := s.serverService.GetServerCountByStatus(serverdomain.ServerStatusRunning)
	if err != nil {
		return nil, err
	}

	stoppedCount, err := s.serverService.GetServerCountByStatus(serverdomain.ServerStatusStopped)
	if err != nil {
		return nil, err
	}

	proxiesEnabledCount, err := s.proxyService.GetProxyCountByStatus(proxydomain.ProxyStatusEnabled)
	if err != nil {
		return nil, err
	}

	proxiesDisabledCount, err := s.proxyService.GetProxyCountByStatus(proxydomain.ProxyStatusDisabled)
	if err != nil {
		return nil, err
	}

	proxiesOnlineCount, err := s.proxyService.GetProxyCountByBootStatus(proxydomain.ProxyBootStatusOnline)
	if err != nil {
		return nil, err
	}

	maxLatency, err := s.serverService.GetMaxLatency()
	if err != nil {
		return nil, err
	}

	proxyTypeCounts, err := s.proxyService.GetProxyCountsByType()
	if err != nil {
		return nil, err
	}

	return &DashboardStats{
		RunningCount:         runningCount,
		StoppedCount:         stoppedCount,
		ProxiesEnabledCount:  proxiesEnabledCount,
		ProxiesDisabledCount: proxiesDisabledCount,
		ProxiesOnlineCount:   proxiesOnlineCount,
		MaxLatency:           maxLatency,
		ProxyTypeCounts:      proxyTypeCounts,
		UptimeSeconds:        int64(time.Since(s.startTime).Seconds()),
	}, nil
}

func (s *Service) GetTopology() (*TopologyData, error) {
	var servers []TopologyServerItem
	if err := s.app.DB().Select("id", "serverName", "serverAddr", "bootStatus").From("fh_servers").All(&servers); err != nil {
		return nil, err
	}
	if servers == nil {
		servers = []TopologyServerItem{}
	}

	var proxies []TopologyProxyItem
	if err := s.app.DB().Select("id", "name", "proxyType", "localIP", "localPort", "remotePort", "status", "bootStatus", "serverId").From("fh_proxies").All(&proxies); err != nil {
		return nil, err
	}
	if proxies == nil {
		proxies = []TopologyProxyItem{}
	}

	return &TopologyData{Servers: servers, Proxies: proxies}, nil
}
