package persistence

import (
	"podux/internal/domain/server"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

type ServerRepository struct {
	app core.App
}

func NewServerRepository(app core.App) *ServerRepository {
	return &ServerRepository{app: app}
}

func (r *ServerRepository) CountByBootStatus(status server.ServerStatus) (int64, error) {
	var count int64
	err := r.app.DB().
		Select("COUNT(*)").
		From("fh_servers").
		Where(dbx.HashExp{"bootStatus": string(status)}).
		Row(&count)

	if err != nil {
		r.app.Logger().Error("Failed to get server count by status", "error", err)
		return 0, err
	}

	return count, nil
}

func (r *ServerRepository) UpdateBootStatus(id string, status server.ServerStatus) error {
	r.app.Logger().Info("Update server boot status", "id", id, "status", status)

	result, err := r.app.DB().
		Update("fh_servers",
			dbx.Params{"bootStatus": string(status)},
			dbx.NewExp("id = {:id} AND bootStatus != {:status}", dbx.Params{
				"id":     id,
				"status": string(status),
			}),
		).Execute()

	if err != nil {
		r.app.Logger().Error("Failed to update server boot status", "id", id, "error", err)
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected > 0 {
		r.app.Logger().Info("Server boot status updated successfully", "id", id, "status", status)
	} else {
		r.app.Logger().Debug("Server boot status unchanged", "id", id, "status", status)
	}

	return nil
}

func (r *ServerRepository) ResetAllBootStatus() error {
	r.app.Logger().Info("Resetting all server status to stopped")

	result, err := r.app.DB().
		Update("fh_servers",
			dbx.Params{"bootStatus": string(server.ServerStatusStopped)},
			dbx.NewExp("bootStatus != {:status} AND bootStatus != ''", dbx.Params{"status": string(server.ServerStatusStopped)}),
		).Execute()

	if err != nil {
		r.app.Logger().Error("Failed to reset server status", "error", err)
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	r.app.Logger().Info("Server status reset completed", "count", rowsAffected)
	return nil
}

func (r *ServerRepository) GetMaxLatency() (int64, error) {
	var maxLatency int64
	// Get the max latency among each target's most recent measurement.
	err := r.app.DB().
		Select("MAX(val)").
		From("fh_metrics_raw").
		Where(dbx.NewExp("metricKey = 'frps_delay' AND t IN (SELECT MAX(t) FROM fh_metrics_raw WHERE metricKey = 'frps_delay' GROUP BY targetId)")).
		Row(&maxLatency)

	if err != nil {
		r.app.Logger().Error("Failed to get max latency", "error", err)
		return 0, err
	}

	return maxLatency, nil
}

func (r *ServerRepository) FindAllWithAutoConnect() ([]server.ServerRecord, error) {
	records, err := r.app.FindAllRecords("fh_servers", dbx.HashExp{"autoConnection": true})
	if err != nil {
		return nil, err
	}

	result := make([]server.ServerRecord, 0, len(records))
	for _, rec := range records {
		result = append(result, server.ServerRecord{
			ID:         rec.Id,
			ServerName: rec.GetString("serverName"),
		})
	}
	return result, nil
}
