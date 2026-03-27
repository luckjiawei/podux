package server

import (
	serverdomain "podux/internal/domain/server"

	"github.com/pocketbase/pocketbase/core"
)

type Service struct {
	app  core.App
	repo serverdomain.Repository
}

func NewService(app core.App, repo serverdomain.Repository) *Service {
	return &Service{app: app, repo: repo}
}

func (s *Service) GetMaxLatency() (int64, error) {
	return s.repo.GetMaxLatency()
}
