package httphandler

import (
	"frpc-hub/internal/application/github"

	"github.com/pocketbase/pocketbase/core"
)

type GithubHandler struct {
	app     core.App
	service *github.Service
}

func NewGithubHandler(app core.App, service *github.Service) *GithubHandler {
	return &GithubHandler{
		app:     app,
		service: service,
	}
}

func (h *GithubHandler) RegisterHandlers(e *core.ServeEvent) {
	e.Router.GET("/api/github/frp/releases", func(e *core.RequestEvent) error {
		releases, err := h.service.GetFrpReleases()
		if err != nil {
			return e.JSON(500, map[string]string{"error": err.Error()})
		}
		return e.JSON(200, releases)
	})
}
