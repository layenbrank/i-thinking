package server

import (
	"net/http"

	"corex/aliyun-gateway/internal/config"
	"corex/aliyun-gateway/internal/handler"
	"corex/aliyun-gateway/internal/middleware"
	"corex/aliyun-gateway/internal/service/sms"
)

func NewMux(cfg *config.Config, smsClient *sms.Client) *http.ServeMux {
	smsHandler := handler.NewSMS(cfg, smsClient)
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", handler.Health)

	protected := middleware.APIKeyAuth(cfg.Server.APIKeys)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/api/v1/sms/send":
			smsHandler.Send(w, r)
		case r.Method == http.MethodPost && r.URL.Path == "/api/v1/oss/presign":
			handler.NotImplemented("oss presign")(w, r)
		case r.Method == http.MethodPost && r.URL.Path == "/api/v1/mail/send":
			handler.NotImplemented("mail send")(w, r)
		default:
			http.NotFound(w, r)
		}
	}))
	mux.Handle("/api/v1/", protected)

	return mux
}
