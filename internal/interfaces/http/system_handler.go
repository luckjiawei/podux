package httphandler

import (
	"frpc-hub/internal/application/system"
	"net/http"

	"github.com/pocketbase/pocketbase/core"
)

type SystemHandler struct {
	app     core.App
	service *system.Service
}

func NewSystemHandler(app core.App, service *system.Service) *SystemHandler {
	return &SystemHandler{
		app:     app,
		service: service,
	}
}

func (h *SystemHandler) RegisterHandlers(e *core.ServeEvent) {
	e.Router.GET("/api/system/initialized", func(e *core.RequestEvent) error {
		initialized, err := h.service.CheckInitialized()
		if err != nil {
			return e.JSON(http.StatusInternalServerError, map[string]interface{}{
				"error": err.Error(),
			})
		}

		return e.JSON(http.StatusOK, map[string]interface{}{
			"initialized": initialized,
		})
	})

	e.Router.GET("/api/system/settings", func(e *core.RequestEvent) error {
		settings, err := h.service.GetSettings()
		if err != nil {
			return e.JSON(http.StatusInternalServerError, map[string]interface{}{
				"error": err.Error(),
			})
		}

		return e.JSON(http.StatusOK, settings)
	})

	// Update system settings
	e.Router.PUT("/api/system/settings", func(e *core.RequestEvent) error {
		var req system.UpdateSettingsRequest
		if err := e.BindBody(&req); err != nil {
			return e.JSON(http.StatusBadRequest, map[string]interface{}{
				"error": "Invalid request body",
			})
		}

		if err := h.service.UpdateSettings(&req); err != nil {
			return e.JSON(http.StatusInternalServerError, map[string]interface{}{
				"error": err.Error(),
			})
		}

		return e.JSON(http.StatusOK, map[string]interface{}{
			"message": "Settings updated successfully",
		})
	})

	e.Router.GET("/api/system/version", func(e *core.RequestEvent) error {
		return e.JSON(http.StatusOK, map[string]string{
			"version": h.service.GetAppVersion(),
		})
	})

	e.Router.GET("/api/system/latest-version", func(e *core.RequestEvent) error {
		latest, err := h.service.GetLatestVersion()
		if err != nil {
			return e.JSON(http.StatusInternalServerError, map[string]interface{}{
				"error": err.Error(),
			})
		}
		return e.JSON(http.StatusOK, latest)
	})

	// Initialize system (create admin user and settings)
	e.Router.POST("/api/system/initialize", func(e *core.RequestEvent) error {
		var req system.InitializeRequest
		if err := e.BindBody(&req); err != nil {
			return e.JSON(http.StatusBadRequest, map[string]interface{}{
				"error": "Invalid request body",
			})
		}

		if err := h.service.InitializeSystem(&req); err != nil {
			return e.JSON(http.StatusBadRequest, map[string]interface{}{
				"error": err.Error(),
			})
		}

		return e.JSON(http.StatusOK, map[string]interface{}{
			"message": "System initialized successfully",
		})
	})
}
