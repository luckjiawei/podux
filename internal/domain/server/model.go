package server

// ServerRecord is a lightweight struct for DB scanning operations.
type ServerRecord struct {
	ID         string `db:"id"`
	ServerName string `db:"serverName"`
}
