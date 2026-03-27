package tunnel

type Repository interface {
	UpdateStatusByServerID(serverID string, status TunnelStatus) error
	UpdateStatusByIntegrationID(integrationID string, status TunnelStatus) error
	ResetAllStatus() error
	CountByStatus(status TunnelStatus) (int64, error)
}
