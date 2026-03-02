package proxy

import (
	proxydomain "frpc-hub/internal/domain/proxy"

	"github.com/pocketbase/pocketbase/core"
)

type Service struct {
	app  core.App
	repo proxydomain.Repository
}

func NewService(app core.App, repo proxydomain.Repository) *Service {
	return &Service{app: app, repo: repo}
}

func (s *Service) GetProxyCountByStatus(status proxydomain.ProxyStatus) (int64, error) {
	return s.repo.CountByStatus(status)
}

func (s *Service) GetProxyCountByBootStatus(status proxydomain.ProxyBootStatus) (int64, error) {
	return s.repo.CountByBootStatus(status)
}

func (s *Service) GetProxyCountsByType() (map[string]int64, error) {
	return s.repo.CountByType()
}

func (s *Service) UpdateProxyBootStatus(proxyID string, status proxydomain.ProxyBootStatus) error {
	return s.repo.UpdateBootStatus(proxyID, status)
}

func (s *Service) UpdateProxyBootStatusByServerID(serverID string, status proxydomain.ProxyBootStatus) error {
	return s.repo.UpdateBootStatusByServerID(serverID, status)
}

func (s *Service) ResetAllProxyBootStatus() {
	if err := s.repo.ResetAllBootStatus(); err != nil {
		s.app.Logger().Error("ResetAllProxyBootStatus failed", "error", err)
	}
}
