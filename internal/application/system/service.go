package system

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"frpc-hub/pkg/buildinfo"

	"github.com/pocketbase/pocketbase/core"
)

const SettingsID = "wcstsqmz8hur331"

type Service struct {
	app core.App
}

type InitializeRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Language string `json:"language"`
}

type SettingsResponse struct {
	ID          string                 `json:"id"`
	Initialized bool                   `json:"initialized"`
	General     map[string]interface{} `json:"general"`
}

type UpdateSettingsRequest struct {
	General map[string]interface{} `json:"general"`
}

func NewService(app core.App) *Service {
	return &Service{app: app}
}

// CheckInitialized checks if the system has been initialized.
func (s *Service) CheckInitialized() (bool, error) {
	collection, err := s.app.FindCollectionByNameOrId("fh_settings")
	if err != nil {
		return false, fmt.Errorf("failed to find settings collection: %w", err)
	}

	record, err := s.app.FindRecordById(collection, SettingsID)
	if err != nil {
		// If record doesn't exist, system is not initialized
		return false, nil
	}

	initialized := record.GetBool("initialized")
	return initialized, nil
}

// GetSettings retrieves the system settings.
func (s *Service) GetSettings() (*SettingsResponse, error) {
	collection, err := s.app.FindCollectionByNameOrId("fh_settings")
	if err != nil {
		return nil, fmt.Errorf("failed to find settings collection: %w", err)
	}

	record, err := s.app.FindRecordById(collection, SettingsID)
	if err != nil {
		return nil, fmt.Errorf("failed to find settings record: %w", err)
	}

	general := make(map[string]interface{})
	if generalField := record.Get("general"); generalField != nil {
		if generalMap, ok := generalField.(map[string]interface{}); ok {
			general = generalMap
		} else if generalStr, ok := generalField.(string); ok {
			if err := json.Unmarshal([]byte(generalStr), &general); err != nil {
				s.app.Logger().Warn("Failed to unmarshal general settings", "error", err)
			}
		}
	}

	return &SettingsResponse{
		ID:          record.Id,
		Initialized: record.GetBool("initialized"),
		General:     general,
	}, nil
}

// UpdateSettings updates the system settings.
func (s *Service) UpdateSettings(req *UpdateSettingsRequest) error {
	if req.General == nil {
		return errors.New("general settings cannot be nil")
	}

	generalJSON, err := json.Marshal(req.General)
	if err != nil {
		return fmt.Errorf("failed to marshal general settings: %w", err)
	}

	_, err = s.app.DB().NewQuery(`
		UPDATE fh_settings
		SET general = {:general}, updated = STRFTIME('%Y-%m-%d %H:%M:%S', 'now')
		WHERE id = {:id}
	`).Bind(map[string]interface{}{
		"general": string(generalJSON),
		"id":      SettingsID,
	}).Execute()

	if err != nil {
		return fmt.Errorf("failed to update settings: %w", err)
	}

	s.app.Logger().Info("Settings updated successfully")
	return nil
}

// GetAppVersion returns the application version.
func (s *Service) GetAppVersion() string {
	return buildinfo.AppVersion
}

// LatestVersionResponse holds the latest release info from GitHub.
type LatestVersionResponse struct {
	TagName string `json:"tag_name"`
	HTMLURL string `json:"html_url"`
}

// GetLatestVersion fetches the latest frpc-hub release from GitHub.
func (s *Service) GetLatestVersion() (*LatestVersionResponse, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	req, err := http.NewRequest("GET", "https://api.github.com/repos/luckjiawei/frpc-hub/releases/latest", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "frpc-hub-server")
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github api returned status: %d", resp.StatusCode)
	}

	var release LatestVersionResponse
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, err
	}

	return &release, nil
}

// InitializeSystem initializes the system with admin user and settings (with transaction).
func (s *Service) InitializeSystem(req *InitializeRequest) error {
	if req.Email == "" || req.Password == "" {
		return errors.New("email and password are required")
	}

	if req.Language != "en" && req.Language != "zh" {
		req.Language = "en"
	}

	initialized, err := s.CheckInitialized()
	if err != nil {
		return fmt.Errorf("failed to check initialization status: %w", err)
	}

	if initialized {
		return errors.New("system is already initialized")
	}

	return s.app.RunInTransaction(func(txApp core.App) error {
		usersCollection, err := txApp.FindCollectionByNameOrId("fh_users")
		if err != nil {
			return fmt.Errorf("failed to find users collection: %w", err)
		}

		userRecord := core.NewRecord(usersCollection)
		userRecord.Set("email", req.Email)
		userRecord.Set("password", req.Password)
		userRecord.Set("passwordConfirm", req.Password)
		userRecord.Set("emailVisibility", true)

		if err := txApp.Save(userRecord); err != nil {
			return fmt.Errorf("failed to create admin user: %w", err)
		}

		settingsCollection, err := txApp.FindCollectionByNameOrId("fh_settings")
		if err != nil {
			return fmt.Errorf("failed to find settings collection: %w", err)
		}

		settingsRecord, err := txApp.FindRecordById(settingsCollection, SettingsID)
		if err != nil {
			settingsRecord = core.NewRecord(settingsCollection)
			settingsRecord.Set("id", SettingsID)
		}

		settingsRecord.Set("initialized", true)
		settingsRecord.Set("general", map[string]interface{}{
			"defaultLanguage": req.Language,
		})

		if err := txApp.Save(settingsRecord); err != nil {
			return fmt.Errorf("failed to save settings: %w", err)
		}

		s.app.Logger().Info("System initialized successfully",
			"email", req.Email,
			"language", req.Language,
		)

		return nil
	})
}
