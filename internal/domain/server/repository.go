package server

// Repository defines persistence operations for the server domain.
type Repository interface {
	CountByBootStatus(status ServerStatus) (int64, error)
	UpdateBootStatus(id string, status ServerStatus) error
	ResetAllBootStatus() error
	GetMaxLatency() (int64, error)
	FindAllWithAutoConnect() ([]ServerRecord, error)
}
