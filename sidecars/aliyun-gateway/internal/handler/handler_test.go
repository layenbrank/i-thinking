package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"corex/aliyun-gateway/internal/config"
	"corex/aliyun-gateway/internal/middleware"
)

func TestHealth(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	Health(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}

	var env Envelope
	if err := json.Unmarshal(rec.Body.Bytes(), &env); err != nil {
		t.Fatal(err)
	}
	if env.Code != 0 {
		t.Fatalf("code=%d", env.Code)
	}
}

func TestSMSHandler_NotConfigured(t *testing.T) {
	cfg := &config.Config{
		Server: config.ServerConfig{APIKeys: []string{"test"}},
	}
	h := NewSMS(cfg, nil)

	body := bytes.NewBufferString(`{"phone":"13800138000","template_param":{"code":"123456"}}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/sms/send", body)
	rec := httptest.NewRecorder()

	h.Send(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestSMSHandler_InvalidJSON(t *testing.T) {
	cfg := &config.Config{
		Server: config.ServerConfig{APIKeys: []string{"test"}},
	}
	h := NewSMS(cfg, nil)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/sms/send", bytes.NewBufferString("not-json"))
	rec := httptest.NewRecorder()

	h.Send(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status=%d", rec.Code)
	}
}

func TestAPIKeyAuth(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := middleware.APIKeyAuth([]string{"secret"})(next)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("missing key: status=%d", rec.Code)
	}

	req.Header.Set("X-API-Key", "wrong")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("wrong key: status=%d", rec.Code)
	}

	req.Header.Set("X-API-Key", "secret")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("valid key: status=%d", rec.Code)
	}
}
