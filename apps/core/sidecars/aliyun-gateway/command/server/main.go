package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"corex/aliyun-gateway/internal/config"
	"corex/aliyun-gateway/internal/server"
	"corex/aliyun-gateway/internal/service/sms"
)

func main() {
	configPath := os.Getenv("CONFIG")
	if configPath == "" {
		configPath = "config.json"
	}

	cfg, err := config.Load(configPath)
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	var smsClient *sms.Client
	if cfg.SMSReady() {
		smsClient, err = sms.New(cfg)
		if err != nil {
			log.Fatalf("init sms client: %v", err)
		}
		log.Printf("sms client ready (region=%s sign=%s)", cfg.Aliyun.Region, cfg.SMS.SignName)
	} else {
		log.Printf("sms not configured (missing AK/SK or sign/template); /api/v1/sms/send returns 503")
	}

	srv := &http.Server{
		Addr:              cfg.Server.Addr,
		Handler:           server.NewMux(cfg, smsClient),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("aliyun-gateway listening on %s", cfg.Server.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}
