package server

// Repository defines persistence operations for the server domain.
type Repository interface {
	GetMaxLatency() (int64, error)
	FindAllWithAutoConnect() ([]ServerRecord, error)
}
