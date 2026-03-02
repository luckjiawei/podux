package proxy

import "frpc-hub/pkg/types"

// Proxy represents a frpc proxy configuration record.
type Proxy struct {
	Id            string                `db:"id" json:"id"`
	ServerId      string                `db:"serverId" json:"serverId"`
	ProxyType     string                `db:"proxyType" json:"proxyType"`
	Name          string                `db:"name" json:"name"`
	LocalIP       string                `db:"localIP" json:"localIp"`
	LocalPort     types.NullableInt     `db:"localPort" json:"localPort"`
	RemotePort    types.NullableInt     `db:"remotePort" json:"remotePort,omitempty"`
	Subdomain     string                `db:"subdomain" json:"subdomain"`
	CustomDomains types.JSONStringArray `db:"customDomains" json:"customDomains"`
	Transport     types.JSONMap         `db:"transport" json:"transport"`
	Description   string                `db:"description" json:"description"`
	Status        string                `db:"status" json:"status"`
}

type ProxyStatus string

const (
	ProxyStatusEnabled  ProxyStatus = "enabled"
	ProxyStatusDisabled ProxyStatus = "disabled"
)

type ProxyBootStatus string

const (
	ProxyBootStatusOnline  ProxyBootStatus = "online"
	ProxyBootStatusOffline ProxyBootStatus = "offline"
)
