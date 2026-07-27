package importer

import (
	"testing"

	"github.com/pelletier/go-toml/v2"
)

func TestParseXTCPProxyAndVisitor(t *testing.T) {
	content := `serverAddr = "frps.example.com"
[[proxies]]
name = "ssh"
type = "xtcp"
localPort = 22
secretKey = "secret"
allowUsers = ["user1"]

[[visitors]]
name = "ssh-client"
type = "xtcp"
serverUser = "user1"
serverName = "ssh"
secretKey = "secret"
bindPort = 9001
protocol = "quic"
`
	var cfg tomlFrpClientConfig
	if err := toml.Unmarshal([]byte(content), &cfg); err != nil {
		t.Fatal(err)
	}
	if len(cfg.Proxies) != 1 || cfg.Proxies[0].SecretKey != "secret" || len(cfg.Proxies[0].AllowUsers) != 1 {
		t.Fatalf("unexpected proxy: %#v", cfg.Proxies)
	}
	if len(cfg.Visitors) != 1 || cfg.Visitors[0].BindPort != 9001 || cfg.Visitors[0].Protocol != "quic" {
		t.Fatalf("unexpected visitor: %#v", cfg.Visitors)
	}
}
