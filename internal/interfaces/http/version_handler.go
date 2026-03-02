package httphandler

import (
	"frpc-hub/internal/application/version"

	"github.com/pocketbase/pocketbase/core"
)

type VersionHandler struct {
	app     core.App
	service *version.Service
}

func NewVersionHandler(app core.App, service *version.Service) *VersionHandler {
	return &VersionHandler{
		app:     app,
		service: service,
	}
}

func (h *VersionHandler) RegisterHandlers(e *core.ServeEvent) {
	e.Router.GET("/api/frp/version", func(e *core.RequestEvent) error {
		return e.JSON(200, map[string]string{
			"frp": h.service.GetFrpVersion(),
		})
	})
}
