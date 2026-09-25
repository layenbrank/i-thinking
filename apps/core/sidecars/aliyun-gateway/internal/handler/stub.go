package handler

import "net/http"

func NotImplemented(feature string) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		WriteError(w, http.StatusNotImplemented, 501, feature+" not implemented")
	}
}
