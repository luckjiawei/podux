package binary

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

type binarySpec struct {
	githubOwner  string
	githubRepo   string
	// resolveAsset returns (assetFilename, entryPath).
	// entryPath is the path of the binary inside the archive; empty means the asset is a raw binary.
	resolveAsset func(version, goos, goarch string) (assetFilename, entryPath string, err error)
}

var specs = map[string]binarySpec{
	"cloudflared": {
		githubOwner: "cloudflare",
		githubRepo:  "cloudflared",
		resolveAsset: func(version, goos, goarch string) (string, string, error) {
			switch goos + "/" + goarch {
			case "linux/amd64":
				return "cloudflared-linux-amd64", "", nil
			case "linux/arm64":
				return "cloudflared-linux-arm64", "", nil
			case "darwin/amd64":
				return "cloudflared-darwin-amd64.tgz", "cloudflared", nil
			case "darwin/arm64":
				return "cloudflared-darwin-arm64.tgz", "cloudflared", nil
			case "windows/amd64":
				return "cloudflared-windows-amd64.exe", "", nil
			default:
				return "", "", fmt.Errorf("cloudflared: unsupported platform %s/%s", goos, goarch)
			}
		},
	},
	"frpc": {
		githubOwner: "fatedier",
		githubRepo:  "frp",
		resolveAsset: func(version, goos, goarch string) (string, string, error) {
			ver := strings.TrimPrefix(version, "v")

			var osStr, archStr string
			switch goos {
			case "linux":
				osStr = "linux"
			case "darwin":
				osStr = "darwin"
			case "windows":
				osStr = "windows"
			default:
				return "", "", fmt.Errorf("frpc: unsupported OS %s", goos)
			}
			switch goarch {
			case "amd64":
				archStr = "amd64"
			case "arm64":
				archStr = "arm64"
			case "arm":
				archStr = "arm"
			default:
				return "", "", fmt.Errorf("frpc: unsupported arch %s", goarch)
			}

			asset := fmt.Sprintf("frp_%s_%s_%s.tar.gz", ver, osStr, archStr)
			binName := "frpc"
			if goos == "windows" {
				binName = "frpc.exe"
			}
			entry := fmt.Sprintf("frp_%s_%s_%s/%s", ver, osStr, archStr, binName)
			return asset, entry, nil
		},
	},
	"rathole": {
		githubOwner: "rapiz1",
		githubRepo:  "rathole",
		resolveAsset: func(version, goos, goarch string) (string, string, error) {
			switch goos + "/" + goarch {
			case "linux/amd64":
				return "rathole-x86_64-unknown-linux-musl.zip", "rathole", nil
			case "linux/arm64":
				return "rathole-aarch64-unknown-linux-musl.zip", "rathole", nil
			case "darwin/amd64":
				return "rathole-x86_64-apple-darwin.zip", "rathole", nil
			case "darwin/arm64":
				return "rathole-aarch64-apple-darwin.zip", "rathole", nil
			case "windows/amd64":
				return "rathole-x86_64-pc-windows-msvc.zip", "rathole.exe", nil
			default:
				return "", "", fmt.Errorf("rathole: unsupported platform %s/%s", goos, goarch)
			}
		},
	},
}

// githubLatestTag returns the tag_name of the latest GitHub release.
func githubLatestTag(ctx context.Context, owner, repo string) (string, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", owner, repo)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "podux")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("GitHub API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("GitHub API returned HTTP %d", resp.StatusCode)
	}

	var release struct {
		TagName string `json:"tag_name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return "", fmt.Errorf("decode GitHub response: %w", err)
	}
	if release.TagName == "" {
		return "", fmt.Errorf("empty tag_name from GitHub API")
	}
	return release.TagName, nil
}
