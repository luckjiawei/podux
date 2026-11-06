package visitor

import "podux/pkg/types"

// Visitor represents an frpc visitor configuration record.
type Visitor struct {
	Id               string            `db:"id" json:"id"`
	ServerId         string            `db:"serverId" json:"serverId"`
	TargetProxyId    string            `db:"targetProxyId" json:"targetProxyId,omitempty"`
	VisitorType      string            `db:"visitorType" json:"visitorType"`
	Name             string            `db:"name" json:"name"`
	ServerUser       string            `db:"serverUser" json:"serverUser,omitempty"`
	ServerName       string            `db:"serverName" json:"serverName,omitempty"`
	SecretKey        string            `db:"secretKey" json:"secretKey,omitempty"`
	BindAddr         string            `db:"bindAddr" json:"bindAddr"`
	BindPort         types.NullableInt `db:"bindPort" json:"bindPort"`
	Protocol         string            `db:"protocol" json:"protocol"`
	Transport        types.JSONMap     `db:"transport" json:"transport"`
	KeepTunnelOpen   bool              `db:"keepTunnelOpen" json:"keepTunnelOpen"`
	MaxRetriesAnHour int               `db:"maxRetriesAnHour" json:"maxRetriesAnHour"`
	MinRetryInterval int               `db:"minRetryInterval" json:"minRetryInterval"`
	NatTraversal     types.JSONMap     `db:"natTraversal" json:"natTraversal,omitempty"`
	Description      string            `db:"description" json:"description"`
	Status           string            `db:"status" json:"status"`
}

type Status string

const (
	StatusEnabled  Status = "enabled"
	StatusDisabled Status = "disabled"
)
