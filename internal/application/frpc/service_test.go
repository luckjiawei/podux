package frpc

import (
	"encoding/json"
	"testing"

	proxydomain "podux/internal/domain/proxy"
	visitordomain "podux/internal/domain/visitor"
	"podux/pkg/types"

	v1 "github.com/fatedier/frp/pkg/config/v1"
)

type proxyRepoStub struct{ proxies []proxydomain.Proxy }

func (r proxyRepoStub) CountByStatus(proxydomain.ProxyStatus) (int64, error)         { return 0, nil }
func (r proxyRepoStub) CountByBootStatus(proxydomain.ProxyBootStatus) (int64, error) { return 0, nil }
func (r proxyRepoStub) CountByType() (map[string]int64, error)                       { return nil, nil }
func (r proxyRepoStub) UpdateBootStatus(string, proxydomain.ProxyBootStatus) error   { return nil }
func (r proxyRepoStub) UpdateBootStatusByServerID(string, proxydomain.ProxyBootStatus) error {
	return nil
}
func (r proxyRepoStub) ResetAllBootStatus() error                          { return nil }
func (r proxyRepoStub) FindByServerID(string) ([]proxydomain.Proxy, error) { return r.proxies, nil }
func (r proxyRepoStub) FindEnabledByServerID(string) ([]proxydomain.Proxy, error) {
	return r.proxies, nil
}

func TestGenProxyCfgsXTCPAndLegacyTransport(t *testing.T) {
	service := &Service{proxyRepo: proxyRepoStub{proxies: []proxydomain.Proxy{{
		Id: "abc", Name: "ssh", ProxyType: "xtcp", LocalIP: "127.0.0.1",
		LocalPort: types.NullableInt{Int: 22, Valid: true}, SecretKey: "secret",
		AllowUsers: types.JSONStringArray{"user1"}, Transport: types.JSONMap{"use_encryption": true},
	}}}}
	configs, err := service.genProxyCfgs(new(string))
	if err != nil {
		t.Fatal(err)
	}
	config, ok := configs[0].(*v1.XTCPProxyConfig)
	if !ok {
		t.Fatalf("expected XTCPProxyConfig, got %T", configs[0])
	}
	if config.Name != "ssh-abc" || config.Secretkey != "secret" || !config.Transport.UseEncryption {
		t.Fatalf("unexpected config: %#v", config)
	}
}

func TestGenProxyCfgsXTCPRequiresSecret(t *testing.T) {
	service := &Service{proxyRepo: proxyRepoStub{proxies: []proxydomain.Proxy{{Id: "abc", Name: "ssh", ProxyType: "xtcp"}}}}
	if _, err := service.genProxyCfgs(new(string)); err == nil {
		t.Fatal("expected missing secret error")
	}
}

func TestBuildVisitorConfigurer(t *testing.T) {
	visitor := visitordomain.Visitor{Id: "def", Name: "ssh-client", VisitorType: "xtcp", Protocol: "quic", BindPort: types.NullableInt{Int: 9001, Valid: true}}
	dataBytes, _ := json.Marshal(visitor)
	var data map[string]interface{}
	_ = json.Unmarshal(dataBytes, &data)
	data["serverName"] = "ssh-abc"
	data["secretKey"] = "secret"
	data["transport"] = map[string]interface{}{"use_compression": true}
	configurer, err := buildVisitorConfigurer(visitor, data)
	if err != nil {
		t.Fatal(err)
	}
	config := configurer.(*v1.XTCPVisitorConfig)
	if config.Name != "ssh-client-def" || config.ServerName != "ssh-abc" || config.BindPort != 9001 || !config.Transport.UseCompression {
		t.Fatalf("unexpected visitor config: %#v", config)
	}
}
