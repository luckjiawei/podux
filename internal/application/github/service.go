package github

import (
	"encoding/json"
	"fmt"
	"net/http"
	"runtime"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase/core"
)

type Service struct {
	app core.App
}

func NewService(app core.App) *Service {
	return &Service{app: app}
}

// GithubRelease is the simplified release info returned to the frontend.
type GithubRelease struct {
	TagName     string `json:"tag_name"`
	Name        string `json:"name"`
	PublishedAt string `json:"published_at"`
	HTMLURL     string `json:"html_url"`
	DownloadUrl string `json:"download_url"` // Download link automatically matched based on current system architecture
}

// githubInternalRelease used to parse raw GitHub API data
type githubInternalRelease struct {
	TagName     string `json:"tag_name"`
	Name        string `json:"name"`
	PublishedAt string `json:"published_at"`
	HTMLURL     string `json:"html_url"`
	Assets      []struct {
		Name               string `json:"name"`
		BrowserDownloadUrl string `json:"browser_download_url"`
	} `json:"assets"`
}

// GetFrpReleases fetches fatedier/frp releases and auto-matches a download link for the current OS/arch.
func (s *Service) GetFrpReleases() ([]GithubRelease, error) {
	url := "https://api.github.com/repos/fatedier/frp/releases"

	client := &http.Client{
		Timeout: 15 * time.Second,
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "frpc-hub-server")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github api returned status: %d", resp.StatusCode)
	}

	var internalReleases []githubInternalRelease
	if err := json.NewDecoder(resp.Body).Decode(&internalReleases); err != nil {
		return nil, err
	}

	goos := runtime.GOOS
	goarch := runtime.GOARCH

	var releases []GithubRelease
	for _, raw := range internalReleases {
		release := GithubRelease{
			TagName:     raw.TagName,
			Name:        raw.Name,
			PublishedAt: raw.PublishedAt,
			HTMLURL:     raw.HTMLURL,
		}

		for _, asset := range raw.Assets {
			assetName := strings.ToLower(asset.Name)

			if strings.Contains(assetName, goos) && strings.Contains(assetName, goarch) {
				// Special handling for some overlapping cases, e.g., 386 and amd64
				if goarch == "386" && strings.Contains(assetName, "amd64") {
					continue
				}

				release.DownloadUrl = asset.BrowserDownloadUrl
				break
			}
		}

		releases = append(releases, release)
	}

	return releases, nil
}
