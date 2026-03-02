package utils

import "os"

// ReadLastNLines reads the last n lines from a file.
func ReadLastNLines(file *os.File, n int) []string {
	fi, err := file.Stat()
	if err != nil || fi.Size() == 0 {
		return nil
	}

	buf := make([]byte, 0, 4096)
	pos := fi.Size()

	for pos > 0 {
		chunkSize := int64(4096)
		if chunkSize > pos {
			chunkSize = pos
		}
		pos -= chunkSize

		chunk := make([]byte, chunkSize)
		file.ReadAt(chunk, pos)
		buf = append(chunk, buf...)

		// Count newlines; stop reading more chunks once we have enough
		count := 0
		for _, b := range buf {
			if b == '\n' {
				count++
			}
		}
		if count > n+1 {
			break
		}
	}

	// Parse lines from buf
	var lines []string
	start := 0
	for i, b := range buf {
		if b == '\n' {
			line := string(buf[start:i])
			if line != "" {
				lines = append(lines, line)
			}
			start = i + 1
		}
	}
	if start < len(buf) {
		line := string(buf[start:])
		if line != "" {
			lines = append(lines, line)
		}
	}

	if len(lines) > n {
		lines = lines[len(lines)-n:]
	}
	return lines
}
