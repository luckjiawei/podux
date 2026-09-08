package visitor

type Repository interface {
	FindByServerID(serverID string) ([]Visitor, error)
	FindEnabledByServerID(serverID string) ([]Visitor, error)
	FindServerIDsByTargetProxyID(proxyID string) ([]string, error)
	CountByTargetProxyID(proxyID string) (int64, error)
}
