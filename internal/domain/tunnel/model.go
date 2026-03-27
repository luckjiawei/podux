package tunnel

type TunnelStatus string

const (
	TunnelStatusActive   TunnelStatus = "active"
	TunnelStatusInactive TunnelStatus = "inactive"
	TunnelStatusError    TunnelStatus = "error"
)
