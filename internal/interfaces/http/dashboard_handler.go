package httphandler

import (
	"frpc-hub/internal/application/dashboard"
	"frpc-hub/pkg/response"

	"github.com/pocketbase/pocketbase/core"
)

type DashboardHandler struct {
	dashboardService *dashboard.Service
}

type DashboardStatsVo struct {
	RunningCount         int64            `json:"runningCount"`
	StoppedCount         int64            `json:"stoppedCount"`
	ProxiesEnabledCount  int64            `json:"proxiesEnabledCount"`
	ProxiesDisabledCount int64            `json:"proxiesDisabledCount"`
	ProxiesOnlineCount   int64            `json:"proxiesOnlineCount"`
	MaxLatency           int64            `json:"maxLatency"`
	ProxyTypeCounts      map[string]int64 `json:"proxyTypeCounts"`
	UptimeSeconds        int64            `json:"uptimeSeconds"`
}

func NewDashboardHandler(dashboardService *dashboard.Service) *DashboardHandler {
	return &DashboardHandler{dashboardService: dashboardService}
}

func (dh *DashboardHandler) RegisterHandlers(e *core.ServeEvent) {
	e.Router.GET("/api/dashboard/topology", func(e *core.RequestEvent) error {
		data, err := dh.dashboardService.GetTopology()
		if err != nil {
			return e.JSON(500, response.Error(err))
		}
		return e.JSON(200, data)
	})

	e.Router.GET("/api/dashboard/stats", func(e *core.RequestEvent) error {
		stats, err := dh.dashboardService.GetStats()
		if err != nil {
			return e.JSON(500, response.Error(err))
		}
		return e.JSON(200, DashboardStatsVo{
			RunningCount:         stats.RunningCount,
			StoppedCount:         stats.StoppedCount,
			ProxiesEnabledCount:  stats.ProxiesEnabledCount,
			ProxiesDisabledCount: stats.ProxiesDisabledCount,
			ProxiesOnlineCount:   stats.ProxiesOnlineCount,
			MaxLatency:           stats.MaxLatency,
			ProxyTypeCounts:      stats.ProxyTypeCounts,
			UptimeSeconds:        stats.UptimeSeconds,
		})
	})
}
