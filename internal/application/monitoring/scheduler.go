package monitoring

import "github.com/pocketbase/pocketbase/core"

// MetricsScheduler registers cron jobs for metrics aggregation and data retention.
type MetricsScheduler struct {
	app     core.App
	metrics *MetricsService
}

// NewMetricsScheduler creates a new MetricsScheduler.
func NewMetricsScheduler(app core.App, metrics *MetricsService) *MetricsScheduler {
	return &MetricsScheduler{app: app, metrics: metrics}
}

// Register adds all metrics-related cron jobs to the app scheduler.
func (s *MetricsScheduler) Register() {
	// Aggregate raw -> hourly at minute 5 of every hour.
	s.app.Cron().MustAdd("metrics_hourly_agg", "5 * * * *", func() {
		if err := s.metrics.AggregateHourly(); err != nil {
			s.app.Logger().Error("Failed to aggregate hourly metrics", "error", err)
		}
	})

	// Aggregate hourly -> daily and enforce data retention every day at 01:05.
	s.app.Cron().MustAdd("metrics_daily_agg", "5 1 * * *", func() {
		if err := s.metrics.AggregateDaily(); err != nil {
			s.app.Logger().Error("Failed to aggregate daily metrics", "error", err)
		}
		if err := s.metrics.PurgeOldRaw(); err != nil {
			s.app.Logger().Error("Failed to purge old raw metrics", "error", err)
		}
		if err := s.metrics.PurgeOldHourly(); err != nil {
			s.app.Logger().Error("Failed to purge old hourly metrics", "error", err)
		}
	})
}
