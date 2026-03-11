package httphandler

import (
	"frpc-hub/internal/application/frpc"
	"net/http"

	"github.com/pocketbase/pocketbase/core"
)

type FrpcHandler struct {
	app     core.App
	service *frpc.Service
}

func NewFrpcHandler(app core.App, service *frpc.Service) *FrpcHandler {
	return &FrpcHandler{
		app:     app,
		service: service,
	}
}

func (h *FrpcHandler) RegisterHandlers(e *core.ServeEvent) {
	e.Router.POST("/api/frpc/launch", requireAuth(func(e *core.RequestEvent) error {
		data := struct {
			ID string `json:"id"`
		}{}
		if err := e.BindBody(&data); err != nil {
			return e.JSON(400, map[string]string{"error": "invalid request body"})
		}
		id := data.ID
		if id == "" {
			return e.JSON(400, map[string]string{"error": "id is required"})
		}
		if !validID.MatchString(id) {
			return e.JSON(400, map[string]string{"error": "invalid id format"})
		}
		err := h.service.LaunchFrpc(&id)
		if err != nil {
			return e.JSON(500, map[string]string{"error": err.Error()})
		}
		return e.JSON(200, map[string]string{"message": "frpc started"})
	}))

	e.Router.GET("/api/frpc/logs/stream", requireAuth(func(e *core.RequestEvent) error {
		id := e.Request.URL.Query().Get("id")
		if id == "" {
			return e.JSON(400, map[string]string{"error": "id is required"})
		}
		if !validID.MatchString(id) {
			return e.JSON(400, map[string]string{"error": "invalid id format"})
		}

		w := e.Response
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		flusher, ok := w.(http.Flusher)
		if !ok {
			return e.JSON(500, map[string]string{"error": "streaming not supported"})
		}

		h.service.StreamLog(id, e.Request.Context(), w, flusher)
		return nil
	}, h.app))

	e.Router.POST("/api/frpc/terminate", requireAuth(func(e *core.RequestEvent) error {
		data := struct {
			ID string `json:"id"`
		}{}
		if err := e.BindBody(&data); err != nil {
			return e.JSON(400, map[string]string{"error": "invalid request body"})
		}
		id := data.ID
		if id == "" {
			return e.JSON(400, map[string]string{"error": "id is required"})
		}
		if !validID.MatchString(id) {
			return e.JSON(400, map[string]string{"error": "invalid id format"})
		}
		err := h.service.TerminateFrpc(&id)
		if err != nil {
			return e.JSON(500, map[string]string{"error": err.Error()})
		}
		return e.JSON(200, map[string]string{"message": "frpc terminated"})
	}))

	e.Router.POST("/api/frpc/reload", requireAuth(func(e *core.RequestEvent) error {
		data := struct {
			ID string `json:"id"`
		}{}
		if err := e.BindBody(&data); err != nil {
			return e.JSON(400, map[string]string{"error": "invalid request body"})
		}
		id := data.ID
		if id == "" {
			return e.JSON(400, map[string]string{"error": "id is required"})
		}
		if !validID.MatchString(id) {
			return e.JSON(400, map[string]string{"error": "invalid id format"})
		}
		// Only reload if the server is currently running
		if !h.service.IsServerRunning(id) {
			return e.JSON(200, map[string]string{"message": "server not running, skipped"})
		}
		err := h.service.ReloadFrpc(&id)
		if err != nil {
			return e.JSON(500, map[string]string{"error": err.Error()})
		}
		return e.JSON(200, map[string]string{"message": "frpc reloaded"})
	}))
}
