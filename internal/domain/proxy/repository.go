package proxy

// Repository defines persistence operations for the proxy domain.
type Repository interface {
	CountByStatus(status ProxyStatus) (int64, error)
	CountByBootStatus(status ProxyBootStatus) (int64, error)
	CountByType() (map[string]int64, error)
	UpdateBootStatus(id string, status ProxyBootStatus) error
	UpdateBootStatusByServerID(serverID string, status ProxyBootStatus) error
	UpdateBootStatusByIntegrationID(integrationID string, status ProxyBootStatus) error
	ResetAllBootStatus() error
	FindByServerID(serverID string) ([]Proxy, error)
	FindEnabledByServerID(serverID string) ([]Proxy, error)
}
