package version

import (
	"runtime/debug"

	"github.com/pocketbase/pocketbase/core"
)

type Service struct {
	app core.App
}

func NewService(app core.App) *Service {
	return &Service{app: app}
}

func (s *Service) GetFrpVersion() string {
	info, ok := debug.ReadBuildInfo()
	if !ok {
		return "unknown"
	}

	for _, dep := range info.Deps {
		if dep.Path == "github.com/fatedier/frp" {
			return dep.Version
		}
	}

	return "unknown"
}
