package handler

import "net/http"

func Health(w http.ResponseWriter, _ *http.Request) {
	WriteJSON(w, http.StatusOK, Envelope{
		Code:    0,
		Message: "ok",
		Data:    map[string]string{"status": "ok"},
	})
}
