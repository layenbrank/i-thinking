package sms

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/aliyun/alibaba-cloud-sdk-go/services/dysmsapi"

	"corex/aliyun-gateway/internal/config"
)

type Client struct {
	cfg    *config.Config
	client *dysmsapi.Client
}

type SendRequest struct {
	Phone          string
	TemplateCode   string
	TemplateParams map[string]string
}

type SendResult struct {
	BizID string `json:"biz_id"`
}

func New(cfg *config.Config) (*Client, error) {
	client, err := dysmsapi.NewClientWithAccessKey(cfg.Aliyun.Region, cfg.Aliyun.AccessKeyID, cfg.Aliyun.AccessKeySecret)
	if err != nil {
		return nil, fmt.Errorf("create dysmsapi client: %w", err)
	}
	return &Client{cfg: cfg, client: client}, nil
}

func (c *Client) Send(req SendRequest) (*SendResult, error) {
	phone := strings.TrimSpace(req.Phone)
	if phone == "" {
		return nil, fmt.Errorf("phone is required")
	}

	templateCode := strings.TrimSpace(req.TemplateCode)
	if templateCode == "" {
		templateCode = c.cfg.SMS.DefaultTemplateCode
	}
	if templateCode == "" {
		return nil, fmt.Errorf("template_code is required")
	}
	if c.cfg.SMS.SignName == "" {
		return nil, fmt.Errorf("sms.sign_name is not configured")
	}

	paramsJSON, err := json.Marshal(req.TemplateParams)
	if err != nil {
		return nil, fmt.Errorf("marshal template_param: %w", err)
	}

	request := dysmsapi.CreateSendSmsRequest()
	request.Scheme = "https"
	request.PhoneNumbers = phone
	request.SignName = c.cfg.SMS.SignName
	request.TemplateCode = templateCode
	request.TemplateParam = string(paramsJSON)

	log.Printf("sms send phone=%s template=%s", maskPhone(phone), templateCode)

	response, err := c.client.SendSms(request)
	if err != nil {
		log.Printf("sms send failed phone=%s err=%v", maskPhone(phone), err)
		return nil, fmt.Errorf("aliyun send sms: %w", err)
	}
	if response.Code != "OK" {
		msg := strings.TrimSpace(response.Message)
		if msg == "" {
			msg = "send sms failed"
		}
		log.Printf("sms send rejected phone=%s code=%s msg=%s", maskPhone(phone), response.Code, msg)
		if isRateLimited(response.Code) {
			return nil, fmt.Errorf("rate limited: %s", msg)
		}
		return nil, fmt.Errorf("%s: %s", response.Code, msg)
	}

	return &SendResult{BizID: response.BizId}, nil
}

func maskPhone(phone string) string {
	phone = strings.TrimSpace(phone)
	if len(phone) <= 4 {
		return "***"
	}
	return phone[:3] + "****"
}

func isRateLimited(code string) bool {
	switch strings.ToUpper(code) {
	case "isv.BUSINESS_LIMIT_CONTROL", "isv.DAY_LIMIT_CONTROL", "isv.MONTH_LIMIT_CONTROL":
		return true
	default:
		return false
	}
}
