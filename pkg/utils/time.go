package utils

import "time"

// RoundDownTo10Minutes rounds down a time to the nearest 10-minute mark
// Example: 10:07:30 -> 10:00:00, 10:15:45 -> 10:10:00, 10:20:00 -> 10:20:00
func RoundDownTo10Minutes(t time.Time) time.Time {
	minutes := t.Minute()
	roundedMinutes := (minutes / 10) * 10
	return time.Date(
		t.Year(), t.Month(), t.Day(),
		t.Hour(), roundedMinutes, 0, 0,
		t.Location(),
	)
}
