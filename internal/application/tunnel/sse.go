package tunnel

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"podux/pkg/utils"
)

// WriteSSEHeaders sets the standard response headers for a Server-Sent Events stream.
func WriteSSEHeaders(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
}

// StreamLogFile tails logPath via SSE. It first sends up to initialLines of
// recent history, then polls for new content every 500 ms until ctx is done.
func StreamLogFile(ctx context.Context, w http.ResponseWriter, flusher http.Flusher, logPath string, initialLines int) {
	file, err := os.Open(logPath)
	if err != nil {
		fmt.Fprintf(w, "data: [No log file found]\n\n")
		flusher.Flush()
		return
	}
	defer file.Close()

	for _, line := range utils.ReadLastNLines(file, initialLines) {
		fmt.Fprintf(w, "data: %s\n\n", line)
	}
	flusher.Flush()

	offset, err := file.Seek(0, io.SeekEnd)
	if err != nil {
		return
	}

	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			fi, err := os.Stat(logPath)
			if err != nil {
				continue
			}
			if fi.Size() < offset {
				file.Close()
				file, err = os.Open(logPath)
				if err != nil {
					continue
				}
				offset = 0
			}
			file.Seek(offset, io.SeekStart)
			scanner := bufio.NewScanner(file)
			hasData := false
			for scanner.Scan() {
				if line := scanner.Text(); line != "" {
					fmt.Fprintf(w, "data: %s\n\n", line)
					hasData = true
				}
			}
			offset, _ = file.Seek(0, io.SeekCurrent)
			if hasData {
				flusher.Flush()
			}
		}
	}
}
