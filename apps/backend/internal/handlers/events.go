package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// publishEvent accepts a client-authored domain event (custom.* namespace)
// and fans it out through the standard publishEvent path — realtime
// subscribers, matching webhooks, and event_pattern functions all fire.
func (h *HTTPHandler) publishEvent(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	var body struct {
		Type string         `json:"type" validate:"required"`
		Data map[string]any `json:"data"`
	}
	if !h.bindAndValidate(c, &body) {
		return
	}
	if err := h.Platform.PublishProjectEvent(c.Request.Context(), actor, projectID, body.Type, body.Data); err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusAccepted, gin.H{"published": body.Type})
}

// realtimePresence returns the count of clients currently subscribed to the
// project's realtime stream.
func (h *HTTPHandler) realtimePresence(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	n, err := h.Platform.Presence(c.Request.Context(), actor, projectID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"online": n})
}
