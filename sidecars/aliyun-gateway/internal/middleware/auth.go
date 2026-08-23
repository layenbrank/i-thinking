package middleware

import (
	"net/http"
	"strings"
)

func APIKeyAuth(validKeys []string) func(http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(validKeys))
	for _, key := range validKeys {
		if key != "" {
			allowed[key] = struct{}{}
		}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := strings.TrimSpace(r.Header.Get("X-API-Key"))
			if key == "" {
				http.Error(w, `{"code":401,"message":"missing X-API-Key"}`, http.StatusUnauthorized)
				return
			}
			if _, ok := allowed[key]; !ok {
				http.Error(w, `{"code":403,"message":"invalid API key"}`, http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
