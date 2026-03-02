package server

type ServerStatus string

const (
	ServerStatusRunning ServerStatus = "running"
	ServerStatusStopped ServerStatus = "stopped"
)

// ServerRecord is a lightweight struct for DB scanning operations.
type ServerRecord struct {
	ID         string `db:"id"`
	ServerName string `db:"serverName"`
}
