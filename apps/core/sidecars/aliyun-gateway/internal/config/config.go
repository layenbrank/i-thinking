package config

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Server ServerConfig `json:"server"`
	Aliyun AliyunConfig `json:"aliyun"`
	SMS    SMSConfig    `json:"sms"`
}

type ServerConfig struct {
	Addr    string   `json:"addr"`
	APIKeys []string `json:"api_keys"`
}

type AliyunConfig struct {
	Region          string `json:"region"`
	AccessKeyID     string `json:"access_key_id"`
	AccessKeySecret string `json:"access_key_secret"`
}

type SMSConfig struct {
	SignName            string `json:"sign_name"`
	DefaultTemplateCode string `json:"default_template_code"`
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	overlayPath := strings.TrimSuffix(path, ".json") + ".local.json"
	if overlayPath != path {
		if overlayData, err := os.ReadFile(overlayPath); err == nil {
			if err := json.Unmarshal(overlayData, &cfg); err != nil {
				return nil, fmt.Errorf("parse local overlay %s: %w", overlayPath, err)
			}
		}
	}

	if cfg.Server.Addr == "" {
		cfg.Server.Addr = ":8090"
	}
	if len(cfg.Server.APIKeys) == 0 {
		return nil, fmt.Errorf("server.api_keys must not be empty")
	}
	if cfg.Aliyun.Region == "" {
		cfg.Aliyun.Region = "cn-hangzhou"
	}

	return &cfg, nil
}

func (c *Config) SMSReady() bool {
	return c.Aliyun.AccessKeyID != "" &&
		c.Aliyun.AccessKeySecret != "" &&
		c.SMS.SignName != "" &&
		c.SMS.DefaultTemplateCode != ""
}
