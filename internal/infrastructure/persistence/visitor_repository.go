package persistence

import (
	"podux/internal/domain/visitor"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

type VisitorRepository struct {
	app core.App
}

func NewVisitorRepository(app core.App) *VisitorRepository {
	return &VisitorRepository{app: app}
}

func (r *VisitorRepository) FindByServerID(serverID string) ([]visitor.Visitor, error) {
	var visitors []visitor.Visitor
	err := r.app.DB().Select("fh_visitors.*").From("fh_visitors").
		Where(dbx.HashExp{"serverId": serverID}).All(&visitors)
	return visitors, err
}

func (r *VisitorRepository) FindEnabledByServerID(serverID string) ([]visitor.Visitor, error) {
	var visitors []visitor.Visitor
	err := r.app.DB().Select("fh_visitors.*").From("fh_visitors").
		Where(dbx.And(
			dbx.HashExp{"serverId": serverID},
			dbx.HashExp{"status": string(visitor.StatusEnabled)},
		)).All(&visitors)
	return visitors, err
}

func (r *VisitorRepository) FindServerIDsByTargetProxyID(proxyID string) ([]string, error) {
	var rows []struct {
		ServerID string `db:"serverId"`
	}
	err := r.app.DB().Select("DISTINCT serverId").From("fh_visitors").
		Where(dbx.HashExp{"targetProxyId": proxyID}).All(&rows)
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.ServerID)
	}
	return ids, nil
}

func (r *VisitorRepository) CountByTargetProxyID(proxyID string) (int64, error) {
	var count int64
	err := r.app.DB().Select("COUNT(*)").From("fh_visitors").
		Where(dbx.HashExp{"targetProxyId": proxyID}).Row(&count)
	return count, err
}
