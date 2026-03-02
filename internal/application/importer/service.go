package importer

import (
	"encoding/json"
	"fmt"

	"github.com/pelletier/go-toml/v2"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

// ==================== TOML Parse Types ====================

type tomlFrpClientConfig struct {
	ServerAddr string              `toml:"serverAddr"`
	ServerPort int                 `toml:"serverPort"`
	Auth       tomlAuthConfig      `toml:"auth"`
	Log        tomlLogConfig       `toml:"log"`
	Transport  tomlTransportConfig `toml:"transport"`
	Metadatas  map[string]string   `toml:"metadatas"`
	Proxies    []tomlProxyConfig   `toml:"proxies"`
}

type tomlAuthConfig struct {
	Method string `toml:"method"`
	Token  string `toml:"token"`
}

type tomlLogConfig struct {
	Level   string `toml:"level"`
	MaxDays int    `toml:"maxDays"`
}

type tomlTransportConfig struct {
	Protocol string        `toml:"protocol"`
	ProxyURL string        `toml:"proxyURL"`
	TLS      tomlTLSConfig `toml:"tls"`
}

type tomlTLSConfig struct {
	Enable                    bool   `toml:"enable"`
	DisableCustomTLSFirstByte bool   `toml:"disableCustomTLSFirstByte"`
	ServerName                string `toml:"serverName"`
	CertFile                  string `toml:"certFile"`
	KeyFile                   string `toml:"keyFile"`
	TrustedCaFile             string `toml:"trustedCaFile"`
}

type tomlProxyConfig struct {
	Name          string                 `toml:"name"`
	Type          string                 `toml:"type"`
	LocalIP       string                 `toml:"localIP"`
	LocalPort     int                    `toml:"localPort"`
	RemotePort    int                    `toml:"remotePort"`
	Subdomain     string                 `toml:"subdomain"`
	CustomDomains []string               `toml:"customDomains"`
	Transport     map[string]interface{} `toml:"transport"`
}

// ==================== API Data Types ====================

type ParseTomlRequest struct {
	TomlContent string `json:"tomlContent"`
}

type ImportServerInfo struct {
	Name        string                 `json:"name"`
	ServerAddr  string                 `json:"serverAddr"`
	ServerPort  int                    `json:"serverPort"`
	Auth        map[string]interface{} `json:"auth"`
	Log         map[string]interface{} `json:"log"`
	Transport   map[string]interface{} `json:"transport"`
	Metadatas   map[string]string      `json:"metadatas"`
	IsDuplicate bool                   `json:"isDuplicate"`
	ExistingId  string                 `json:"existingId"`
}

type ImportProxyInfo struct {
	Name          string                 `json:"name"`
	Type          string                 `json:"type"`
	LocalIP       string                 `json:"localIP"`
	LocalPort     int                    `json:"localPort"`
	RemotePort    int                    `json:"remotePort"`
	Subdomain     string                 `json:"subdomain"`
	CustomDomains []string               `json:"customDomains"`
	Transport     map[string]interface{} `json:"transport"`
	IsDuplicate   bool                   `json:"isDuplicate"`
	ExistingId    string                 `json:"existingId"`
}

type ImportPreviewResponse struct {
	Server  ImportServerInfo  `json:"server"`
	Proxies []ImportProxyInfo `json:"proxies"`
}

type ProxyImportOption struct {
	Name      string `json:"name"`
	Import    bool   `json:"import"`
	Overwrite bool   `json:"overwrite"`
}

type ExecuteImportRequest struct {
	TomlContent     string              `json:"tomlContent"`
	ServerName      string              `json:"serverName"`
	ImportServer    bool                `json:"importServer"`
	OverwriteServer bool                `json:"overwriteServer"`
	Proxies         []ProxyImportOption `json:"proxies"`
}

type ImportResult struct {
	ServerImported  bool `json:"serverImported"`
	ProxiesImported int  `json:"proxiesImported"`
	ProxiesSkipped  int  `json:"proxiesSkipped"`
}

// ==================== Service ====================

type Service struct {
	app core.App
}

func NewService(app core.App) *Service {
	return &Service{app: app}
}

func (s *Service) ParseToml(req *ParseTomlRequest) (*ImportPreviewResponse, error) {
	var cfg tomlFrpClientConfig
	if err := toml.Unmarshal([]byte(req.TomlContent), &cfg); err != nil {
		return nil, fmt.Errorf("TOML 解析失败: %w", err)
	}

	serverPort := cfg.ServerPort
	if serverPort == 0 {
		serverPort = 7000
	}

	// Check if server already exists (by addr + port)
	var existingServerId string
	var serverDuplicate bool
	var existingServerRow struct {
		Id string `db:"id"`
	}
	err := s.app.DB().
		Select("id").
		From("fh_servers").
		Where(dbx.HashExp{
			"serverAddr": cfg.ServerAddr,
			"serverPort": serverPort,
		}).
		One(&existingServerRow)
	if err == nil {
		serverDuplicate = true
		existingServerId = existingServerRow.Id
	}

	// Build auth map
	authMap := map[string]interface{}{
		"method": cfg.Auth.Method,
		"token":  cfg.Auth.Token,
	}

	// Build log map with defaults
	logLevel := cfg.Log.Level
	if logLevel == "" {
		logLevel = "info"
	}
	logMaxDays := cfg.Log.MaxDays
	if logMaxDays == 0 {
		logMaxDays = 3
	}
	logMap := map[string]interface{}{
		"level":   logLevel,
		"maxDays": logMaxDays,
	}

	// Build transport map with defaults
	protocol := cfg.Transport.Protocol
	if protocol == "" {
		protocol = "tcp"
	}
	transportMap := map[string]interface{}{
		"protocol": protocol,
		"proxyURL": cfg.Transport.ProxyURL,
		"tls": map[string]interface{}{
			"enable":                    cfg.Transport.TLS.Enable,
			"disableCustomTLSFirstByte": cfg.Transport.TLS.DisableCustomTLSFirstByte,
			"serverName":                cfg.Transport.TLS.ServerName,
			"certFile":                  cfg.Transport.TLS.CertFile,
			"keyFile":                   cfg.Transport.TLS.KeyFile,
			"trustedCaFile":             cfg.Transport.TLS.TrustedCaFile,
		},
	}

	metadatas := cfg.Metadatas
	if metadatas == nil {
		metadatas = map[string]string{}
	}

	serverInfo := ImportServerInfo{
		Name:        fmt.Sprintf("%s:%d", cfg.ServerAddr, serverPort),
		ServerAddr:  cfg.ServerAddr,
		ServerPort:  serverPort,
		Auth:        authMap,
		Log:         logMap,
		Transport:   transportMap,
		Metadatas:   metadatas,
		IsDuplicate: serverDuplicate,
		ExistingId:  existingServerId,
	}

	// Build proxy infos with duplicate detection
	proxies := make([]ImportProxyInfo, 0, len(cfg.Proxies))
	for _, p := range cfg.Proxies {
		proxyType := p.Type
		if proxyType == "" {
			proxyType = "tcp"
		}
		customDomains := p.CustomDomains
		if customDomains == nil {
			customDomains = []string{}
		}
		proxyTransport := p.Transport
		if proxyTransport == nil {
			proxyTransport = map[string]interface{}{}
		}

		proxyInfo := ImportProxyInfo{
			Name:          p.Name,
			Type:          proxyType,
			LocalIP:       p.LocalIP,
			LocalPort:     p.LocalPort,
			RemotePort:    p.RemotePort,
			Subdomain:     p.Subdomain,
			CustomDomains: customDomains,
			Transport:     proxyTransport,
		}

		// Check proxy duplicate: only meaningful if server already exists
		if serverDuplicate && existingServerId != "" {
			var existingProxyRow struct {
				Id string `db:"id"`
			}
			perr := s.app.DB().
				Select("id").
				From("fh_proxies").
				Where(dbx.HashExp{
					"name":     p.Name,
					"serverId": existingServerId,
				}).
				One(&existingProxyRow)
			if perr == nil {
				proxyInfo.IsDuplicate = true
				proxyInfo.ExistingId = existingProxyRow.Id
			}
		}

		proxies = append(proxies, proxyInfo)
	}

	return &ImportPreviewResponse{
		Server:  serverInfo,
		Proxies: proxies,
	}, nil
}

func (s *Service) ExecuteImport(req *ExecuteImportRequest) (*ImportResult, error) {
	var cfg tomlFrpClientConfig
	if err := toml.Unmarshal([]byte(req.TomlContent), &cfg); err != nil {
		return nil, fmt.Errorf("TOML 解析失败: %w", err)
	}

	serverPort := cfg.ServerPort
	if serverPort == 0 {
		serverPort = 7000
	}

	result := &ImportResult{}

	err := s.app.RunInTransaction(func(txApp core.App) error {
		serverId, err := s.handleServerImport(txApp, &cfg, serverPort, req, result)
		if err != nil {
			return err
		}
		if serverId == "" {
			return nil
		}
		return s.handleProxyImport(txApp, &cfg, serverId, req.Proxies, result)
	})

	if err != nil {
		return nil, err
	}
	return result, nil
}

// handleServerImport creates or updates a server record and returns its ID.
// Returns empty string if server import was skipped.
func (s *Service) handleServerImport(
	txApp core.App,
	cfg *tomlFrpClientConfig,
	serverPort int,
	req *ExecuteImportRequest,
	result *ImportResult,
) (string, error) {
	var existingServerRow struct {
		Id string `db:"id"`
	}
	serverExists := false
	existErr := txApp.DB().
		Select("id").
		From("fh_servers").
		Where(dbx.HashExp{
			"serverAddr": cfg.ServerAddr,
			"serverPort": serverPort,
		}).
		One(&existingServerRow)
	if existErr == nil {
		serverExists = true
	}

	// Server exists but we're not importing: use existing ID for proxies
	if serverExists && !req.ImportServer {
		return existingServerRow.Id, nil
	}

	// Not importing server and it doesn't exist: skip
	if !req.ImportServer {
		return "", nil
	}

	serverName := req.ServerName
	if serverName == "" {
		serverName = fmt.Sprintf("%s:%d", cfg.ServerAddr, serverPort)
	}

	logLevel := cfg.Log.Level
	if logLevel == "" {
		logLevel = "info"
	}
	logMaxDays := cfg.Log.MaxDays
	if logMaxDays == 0 {
		logMaxDays = 3
	}
	protocol := cfg.Transport.Protocol
	if protocol == "" {
		protocol = "tcp"
	}
	metadatas := cfg.Metadatas
	if metadatas == nil {
		metadatas = map[string]string{}
	}

	authJSON, _ := json.Marshal(map[string]interface{}{
		"method": cfg.Auth.Method,
		"token":  cfg.Auth.Token,
	})
	logJSON, _ := json.Marshal(map[string]interface{}{
		"level":   logLevel,
		"maxDays": logMaxDays,
	})
	transportJSON, _ := json.Marshal(map[string]interface{}{
		"protocol": protocol,
		"proxyURL": cfg.Transport.ProxyURL,
		"tls": map[string]interface{}{
			"enable":                    cfg.Transport.TLS.Enable,
			"disableCustomTLSFirstByte": cfg.Transport.TLS.DisableCustomTLSFirstByte,
			"serverName":                cfg.Transport.TLS.ServerName,
			"certFile":                  cfg.Transport.TLS.CertFile,
			"keyFile":                   cfg.Transport.TLS.KeyFile,
			"trustedCaFile":             cfg.Transport.TLS.TrustedCaFile,
		},
	})
	metadatasJSON, _ := json.Marshal(metadatas)

	serversCollection, err := txApp.FindCollectionByNameOrId("fh_servers")
	if err != nil {
		return "", fmt.Errorf("找不到服务器集合: %w", err)
	}

	var serverRecord *core.Record
	if serverExists && req.OverwriteServer {
		serverRecord, err = txApp.FindRecordById(serversCollection, existingServerRow.Id)
		if err != nil {
			return "", fmt.Errorf("查找已有服务器失败: %w", err)
		}
	} else if serverExists && !req.OverwriteServer {
		result.ServerImported = false
		return existingServerRow.Id, nil
	} else {
		serverRecord = core.NewRecord(serversCollection)
	}

	serverRecord.Set("serverName", serverName)
	serverRecord.Set("serverAddr", cfg.ServerAddr)
	serverRecord.Set("serverPort", serverPort)
	serverRecord.Set("serverVersion", "built-in")
	serverRecord.Set("auth", string(authJSON))
	serverRecord.Set("log", string(logJSON))
	serverRecord.Set("transport", string(transportJSON))
	serverRecord.Set("metadatas", string(metadatasJSON))
	serverRecord.Set("bootStatus", "stopped")
	serverRecord.Set("autoConnection", false)
	serverRecord.Set("description", "")

	if err := txApp.Save(serverRecord); err != nil {
		return "", fmt.Errorf("保存服务器失败: %w", err)
	}

	result.ServerImported = true
	return serverRecord.Id, nil
}

// handleProxyImport creates or updates proxy records under the given server.
func (s *Service) handleProxyImport(
	txApp core.App,
	cfg *tomlFrpClientConfig,
	serverId string,
	proxyOpts []ProxyImportOption,
	result *ImportResult,
) error {
	proxyOptMap := make(map[string]ProxyImportOption, len(proxyOpts))
	for _, opt := range proxyOpts {
		proxyOptMap[opt.Name] = opt
	}

	proxiesCollection, err := txApp.FindCollectionByNameOrId("fh_proxies")
	if err != nil {
		return fmt.Errorf("找不到代理集合: %w", err)
	}

	for _, p := range cfg.Proxies {
		opt, ok := proxyOptMap[p.Name]
		if !ok || !opt.Import {
			result.ProxiesSkipped++
			continue
		}

		var existingProxyRow struct {
			Id string `db:"id"`
		}
		proxyExistsErr := txApp.DB().
			Select("id").
			From("fh_proxies").
			Where(dbx.HashExp{
				"name":     p.Name,
				"serverId": serverId,
			}).
			One(&existingProxyRow)

		var proxyRecord *core.Record
		if proxyExistsErr == nil && opt.Overwrite {
			proxyRecord, err = txApp.FindRecordById(proxiesCollection, existingProxyRow.Id)
			if err != nil {
				return fmt.Errorf("查找已有代理 %s 失败: %w", p.Name, err)
			}
		} else if proxyExistsErr == nil && !opt.Overwrite {
			result.ProxiesSkipped++
			continue
		} else {
			proxyRecord = core.NewRecord(proxiesCollection)
		}

		proxyType := p.Type
		if proxyType == "" {
			proxyType = "tcp"
		}
		customDomains := p.CustomDomains
		if customDomains == nil {
			customDomains = []string{}
		}
		customDomainsJSON, _ := json.Marshal(customDomains)

		proxyTransport := p.Transport
		if proxyTransport == nil {
			proxyTransport = map[string]interface{}{}
		}
		proxyTransportJSON, _ := json.Marshal(proxyTransport)

		proxyRecord.Set("name", p.Name)
		proxyRecord.Set("proxyType", proxyType)
		proxyRecord.Set("serverId", serverId)
		proxyRecord.Set("localIP", p.LocalIP)
		proxyRecord.Set("localPort", p.LocalPort)
		proxyRecord.Set("remotePort", p.RemotePort)
		proxyRecord.Set("subdomain", p.Subdomain)
		proxyRecord.Set("customDomains", string(customDomainsJSON))
		proxyRecord.Set("transport", string(proxyTransportJSON))
		proxyRecord.Set("status", "enabled")
		proxyRecord.Set("bootStatus", "offline")
		proxyRecord.Set("description", "")

		if err := txApp.Save(proxyRecord); err != nil {
			return fmt.Errorf("保存代理 %s 失败: %w", p.Name, err)
		}
		result.ProxiesImported++
	}

	return nil
}
