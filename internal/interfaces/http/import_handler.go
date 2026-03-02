package httphandler

import (
	"frpc-hub/internal/application/importer"
	"net/http"

	"github.com/pocketbase/pocketbase/core"
)

type ImportHandler struct {
	app     core.App
	service *importer.Service
}

func NewImportHandler(app core.App, service *importer.Service) *ImportHandler {
	return &ImportHandler{app: app, service: service}
}

func (h *ImportHandler) RegisterHandlers(e *core.ServeEvent) {
	// Preview: parse TOML content and return server/proxy info with duplicate flags
	e.Router.POST("/api/import/preview", func(e *core.RequestEvent) error {
		var req importer.ParseTomlRequest
		if err := e.BindBody(&req); err != nil {
			return e.JSON(http.StatusBadRequest, map[string]interface{}{
				"error": "invalid request body",
			})
		}
		if req.TomlContent == "" {
			return e.JSON(http.StatusBadRequest, map[string]interface{}{
				"error": "TOML content cannot be empty",
			})
		}

		preview, err := h.service.ParseToml(&req)
		if err != nil {
			return e.JSON(http.StatusBadRequest, map[string]interface{}{
				"error": err.Error(),
			})
		}

		return e.JSON(http.StatusOK, preview)
	})

	// Execute: import servers and proxies within a transaction
	e.Router.POST("/api/import/execute", func(e *core.RequestEvent) error {
		var req importer.ExecuteImportRequest
		if err := e.BindBody(&req); err != nil {
			return e.JSON(http.StatusBadRequest, map[string]interface{}{
				"error": "invalid request body",
			})
		}
		if req.TomlContent == "" {
			return e.JSON(http.StatusBadRequest, map[string]interface{}{
				"error": "TOML content cannot be empty",
			})
		}

		result, err := h.service.ExecuteImport(&req)
		if err != nil {
			return e.JSON(http.StatusInternalServerError, map[string]interface{}{
				"error": err.Error(),
			})
		}

		return e.JSON(http.StatusOK, map[string]interface{}{
			"message": "import successful",
			"result":  result,
		})
	})
}
