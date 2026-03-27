// Package binary manages the download and installation of external executables
// (cloudflared, frpc, rathole) into a local bin directory.
package binary

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
)

// BinaryManager handles downloading and installing a single external binary.
type BinaryManager struct {
	Name    string // "cloudflared" | "frpc" | "rathole"
	Version string // "latest" or a specific tag, e.g. "v1.2.3"
	BinDir  string // directory where the binary will be stored
}

// New creates a BinaryManager. Use DefaultBinDir() to obtain the standard location.
func New(name, version, binDir string) *BinaryManager {
	return &BinaryManager{Name: name, Version: version, BinDir: binDir}
}

// DefaultBinDir returns ~/.podux/bin, creating the directory if it does not exist.
func DefaultBinDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("determine home directory: %w", err)
	}
	dir := filepath.Join(home, ".podux", "bin")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("create bin dir %s: %w", dir, err)
	}
	return dir, nil
}

// GetPath returns the absolute path of the binary.
// On Windows the ".exe" suffix is appended automatically.
func (m *BinaryManager) GetPath() string {
	name := m.Name
	if runtime.GOOS == "windows" {
		name += ".exe"
	}
	return filepath.Join(m.BinDir, name)
}

// EnsureInstalled downloads and installs the binary only when it is not already
// present. It is safe to call repeatedly; subsequent calls are no-ops.
func (m *BinaryManager) EnsureInstalled(ctx context.Context) error {
	if _, err := os.Stat(m.GetPath()); err == nil {
		return nil // already installed
	}
	return m.download(ctx)
}

// Update downloads the binary unconditionally, replacing any existing version.
func (m *BinaryManager) Update(ctx context.Context) error {
	return m.download(ctx)
}

// download resolves the version, fetches the asset, extracts it if needed,
// and places the binary at GetPath() with executable permissions.
func (m *BinaryManager) download(ctx context.Context) error {
	if err := os.MkdirAll(m.BinDir, 0o755); err != nil {
		return fmt.Errorf("create bin dir: %w", err)
	}

	s, ok := specs[m.Name]
	if !ok {
		return fmt.Errorf("unknown binary %q (supported: cloudflared, frpc, rathole)", m.Name)
	}

	// Resolve "latest" to the actual tag via the GitHub API.
	version := m.Version
	if version == "" || version == "latest" {
		var err error
		version, err = githubLatestTag(ctx, s.githubOwner, s.githubRepo)
		if err != nil {
			return fmt.Errorf("resolve latest version for %s: %w", m.Name, err)
		}
	}

	assetFilename, entryPath, err := s.resolveAsset(version, runtime.GOOS, runtime.GOARCH)
	if err != nil {
		return err
	}

	downloadURL := fmt.Sprintf(
		"https://github.com/%s/%s/releases/download/%s/%s",
		s.githubOwner, s.githubRepo, version, assetFilename,
	)

	// Download to a temporary file in the same directory so the final rename
	// is atomic (same filesystem).
	tmpFile, err := os.CreateTemp(m.BinDir, ".download-*")
	if err != nil {
		return fmt.Errorf("create temp file: %w", err)
	}
	tmpPath := tmpFile.Name()
	defer func() {
		tmpFile.Close()
		os.Remove(tmpPath) // clean up on error; harmless if already renamed
	}()

	if err := fetchURL(ctx, downloadURL, tmpFile); err != nil {
		return fmt.Errorf("download %s: %w", downloadURL, err)
	}
	tmpFile.Close()

	dest := m.GetPath()

	if entryPath != "" {
		// Asset is an archive; extract the binary from it.
		if err := extractEntry(tmpPath, entryPath, dest); err != nil {
			return fmt.Errorf("extract %s from archive: %w", entryPath, err)
		}
	} else {
		// Asset is a raw binary; rename or copy into place.
		if err := os.Rename(tmpPath, dest); err != nil {
			// Rename can fail across mount points; fall back to copy.
			if err2 := copyFile(tmpPath, dest); err2 != nil {
				return fmt.Errorf("install binary: %w", err2)
			}
		}
	}

	return os.Chmod(dest, 0o755)
}

// fetchURL downloads url into w, following redirects.
func fetchURL(ctx context.Context, url string, w io.Writer) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "podux")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d from %s", resp.StatusCode, url)
	}
	_, err = io.Copy(w, resp.Body)
	return err
}

// copyFile copies src to dst.
func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}
