package httphandler

import (
	"fmt"
	"math"
	"strconv"
	"time"

	"podux/internal/application/monitoring"
	"podux/pkg/response"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

type ServerHandler struct {
	app            core.App
	metricsService *monitoring.MetricsService
}

func NewServerHandler(app core.App, metricsService *monitoring.MetricsService) *ServerHandler {
	return &ServerHandler{app: app, metricsService: metricsService}
}

type serverVO struct {
	ID             string                    `json:"id"`
	ServerName     string                    `json:"serverName"`
	User           string                    `json:"user"`
	ServerAddr     string                    `json:"serverAddr"`
	ServerPort     int                       `json:"serverPort"`
	Description    string                    `json:"description"`
	BootStatus     string                    `json:"bootStatus"`
	AutoConnection bool                      `json:"autoConnection"`
	SendRate       float64                   `json:"sendRate"`
	RecvRate       float64                   `json:"recvRate"`
	GeoLocation    any                       `json:"geoLocation,omitempty"`
	Log            any                       `json:"log,omitempty"`
	Auth           any                       `json:"auth,omitempty"`
	Transport      any                       `json:"transport,omitempty"`
	Metadatas      any                       `json:"metadatas,omitempty"`
	Created        string                    `json:"created"`
	Updated        string                    `json:"updated"`
	NetworkStatus  *monitoring.NetworkStatus `json:"networkStatus,omitempty"`
}

type serverListResponse struct {
	Page       int        `json:"page"`
	PerPage    int        `json:"perPage"`
	TotalItems int64      `json:"totalItems"`
	TotalPages int        `json:"totalPages"`
	Items      []serverVO `json:"items"`
}

type serverOptionVO struct {
	ID            string                    `json:"id"`
	ServerName    string                    `json:"serverName"`
	BootStatus    string                    `json:"bootStatus"`
	NetworkStatus *monitoring.NetworkStatus `json:"networkStatus,omitempty"`
}

type probePoint struct {
	T   string  `json:"t"`
	Val float64 `json:"val"`
}

func (h *ServerHandler) RegisterHandlers(e *core.ServeEvent) {
	// Paginated server list with assembled latency metrics.
	e.Router.GET("/api/servers", requireAuth(func(e *core.RequestEvent) error {
		page, _ := strconv.Atoi(e.Request.URL.Query().Get("page"))
		if page < 1 {
			page = 1
		}
		perPage, _ := strconv.Atoi(e.Request.URL.Query().Get("perPage"))
		if perPage < 1 {
			perPage = 10
		}
		search := e.Request.URL.Query().Get("search")

		// Count total matching records
		var total int64
		countQ := h.app.DB().Select("COUNT(*)").From("fh_servers")
		if search != "" {
			countQ = countQ.Where(dbx.NewExp(
				"(serverName LIKE {:s} OR serverAddr LIKE {:s} OR description LIKE {:s})",
				dbx.Params{"s": "%" + search + "%"},
			))
		}
		if err := countQ.Row(&total); err != nil {
			return e.JSON(500, response.Error(err))
		}

		// Fetch the page of records
		var records []*core.Record
		var err error
		if search != "" {
			records, err = h.app.FindRecordsByFilter(
				"fh_servers",
				"serverName ~ {:s} || serverAddr ~ {:s} || description ~ {:s}",
				"-created",
				perPage,
				(page-1)*perPage,
				map[string]any{"s": search},
			)
		} else {
			records, err = h.app.FindRecordsByFilter("fh_servers", "", "-created", perPage, (page-1)*perPage)
		}
		if err != nil {
			return e.JSON(500, response.Error(err))
		}

		latencyMap, err := h.metricsService.GetLatestLatencyBatch()
		if err != nil {
			h.app.Logger().Warn("Failed to get latency batch", "error", err)
			latencyMap = map[string]*monitoring.NetworkStatus{}
		}

		totalPages := int(math.Ceil(float64(total) / float64(perPage)))
		items := make([]serverVO, 0, len(records))
		for _, r := range records {
			items = append(items, serverVO{
				ID:             r.Id,
				ServerName:     r.GetString("serverName"),
				User:           r.GetString("user"),
				ServerAddr:     r.GetString("serverAddr"),
				ServerPort:     r.GetInt("serverPort"),
				Description:    r.GetString("description"),
				BootStatus:     r.GetString("bootStatus"),
				AutoConnection: r.GetBool("autoConnection"),
				SendRate:       r.GetFloat("sendRate"),
				RecvRate:       r.GetFloat("recvRate"),
				GeoLocation:    r.Get("geoLocation"),
				Log:            r.Get("log"),
				Auth:           r.Get("auth"),
				Transport:      r.Get("transport"),
				Metadatas:      r.Get("metadatas"),
				Created:        r.GetString("created"),
				Updated:        r.GetString("updated"),
				NetworkStatus:  latencyMap[r.Id],
			})
		}

		return e.JSON(200, serverListResponse{
			Page:       page,
			PerPage:    perPage,
			TotalItems: total,
			TotalPages: totalPages,
			Items:      items,
		})
	}))

	// Probe history for a single server — last 30 minutes of latency data.
	e.Router.GET("/api/servers/probe-history", requireAuth(func(e *core.RequestEvent) error {
		serverID := e.Request.URL.Query().Get("serverId")
		if serverID == "" {
			return e.JSON(400, response.Error(fmt.Errorf("serverId is required")))
		}

		since := time.Now().UTC().Add(-30 * time.Minute).Format("2006-01-02 15:04:05.000Z")

		type row struct {
			T   string  `db:"t"`
			Val float64 `db:"val"`
		}
		var rows []row
		err := h.app.DB().
			NewQuery(`
				SELECT r.t, r.val
				FROM fh_metrics_raw r
				INNER JOIN fh_metrics_targets t ON r.targetId = t.id
				WHERE t.serverId = {:serverId}
				  AND r.metricKey = {:key}
				  AND r.t >= {:since}
				ORDER BY r.t ASC
				LIMIT 500
			`).
			Bind(dbx.Params{
				"serverId": serverID,
				"key":      monitoring.MetricKeyFrpsDelay,
				"since":    since,
			}).
			All(&rows)
		if err != nil {
			return e.JSON(500, response.Error(err))
		}

		points := make([]probePoint, 0, len(rows))
		for _, r := range rows {
			points = append(points, probePoint{T: r.T, Val: r.Val})
		}
		return e.JSON(200, points)
	}))

	// Flat server list for dropdowns, with latest latency assembled.
	e.Router.GET("/api/servers/options", requireAuth(func(e *core.RequestEvent) error {
		records, err := h.app.FindRecordsByFilter("fh_servers", "", "-created", 500, 0)
		if err != nil {
			return e.JSON(500, response.Error(err))
		}

		latencyMap, err := h.metricsService.GetLatestLatencyBatch()
		if err != nil {
			h.app.Logger().Warn("Failed to get latency batch for options", "error", err)
			latencyMap = map[string]*monitoring.NetworkStatus{}
		}

		items := make([]serverOptionVO, 0, len(records))
		for _, r := range records {
			items = append(items, serverOptionVO{
				ID:            r.Id,
				ServerName:    r.GetString("serverName"),
				BootStatus:    r.GetString("bootStatus"),
				NetworkStatus: latencyMap[r.Id],
			})
		}

		return e.JSON(200, items)
	}))
}
