package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoad_Defaults(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	if err := os.WriteFile(path, []byte(`{
		"server": {"api_keys": ["test-key"]},
		"aliyun": {"region": "cn-hangzhou"},
		"sms": {"sign_name": "Test", "default_template_code": "SMS_001"}
	}`), 0o600); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Server.Addr != ":8090" {
		t.Fatalf("addr=%q", cfg.Server.Addr)
	}
	if cfg.SMSReady() {
		t.Fatal("expected not ready without AK/SK")
	}
}

func TestLoad_LocalOverlay(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	localPath := filepath.Join(dir, "config.local.json")
	if err := os.WriteFile(path, []byte(`{
		"server": {"api_keys": ["test-key"]},
		"aliyun": {},
		"sms": {"sign_name": "Test", "default_template_code": "SMS_001"}
	}`), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(localPath, []byte(`{
		"aliyun": {
			"access_key_id": "ak",
			"access_key_secret": "sk"
		}
	}`), 0o600); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if !cfg.SMSReady() {
		t.Fatal("expected ready after overlay")
	}
}
