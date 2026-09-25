package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"corex/aliyun-gateway/internal/config"
	"corex/aliyun-gateway/internal/service/sms"
)

type SMSHandler struct {
	cfg    *config.Config
	client *sms.Client
}

func NewSMS(cfg *config.Config, client *sms.Client) *SMSHandler {
	return &SMSHandler{cfg: cfg, client: client}
}

type sendSMSBody struct {
	Phone          string            `json:"phone"`
	TemplateCode   string            `json:"template_code"`
	TemplateParam  map[string]string `json:"template_param"`
}

func (h *SMSHandler) Send(w http.ResponseWriter, r *http.Request) {
	var body sendSMSBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, http.StatusBadRequest, 400, "invalid json body")
		return
	}

	if h.client == nil {
		WriteError(w, http.StatusServiceUnavailable, 503, "sms client not configured")
		return
	}

	result, err := h.client.Send(sms.SendRequest{
		Phone:          body.Phone,
		TemplateCode:   body.TemplateCode,
		TemplateParams: body.TemplateParam,
	})
	if err != nil {
		status, code, msg := mapSMSError(err)
		WriteError(w, status, code, msg)
		return
	}

	WriteOK(w, result)
}

func mapSMSError(err error) (httpStatus int, code int, message string) {
	msg := err.Error()
	lower := strings.ToLower(msg)
	switch {
	case strings.Contains(lower, "phone is required"), strings.Contains(lower, "template_code"):
		return http.StatusBadRequest, 400, msg
	case strings.Contains(lower, "rate limited"):
		return http.StatusTooManyRequests, 429, "sms rate limited"
	default:
		return http.StatusBadGateway, 502, msg
	}
}
