package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/tdvorak/primora/apps/backend/internal/middleware"
	apperrors "github.com/tdvorak/primora/apps/backend/internal/response"
	"github.com/tdvorak/primora/apps/backend/internal/services"
)

// ingestCORS — SDKs send telemetry from arbitrary origins (browsers, phones,
// desktops), so this one route allows any origin.
func ingestCORS(c *gin.Context) {
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("Access-Control-Allow-Headers", "Content-Type, X-Primora-Key, X-API-Key, Authorization")
	c.Header("Access-Control-Allow-Methods", "POST")
}

func (h *HTTPHandler) ingestOptions(c *gin.Context) {
	ingestCORS(c)
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) ingest(c *gin.Context) {
	ingestCORS(c)
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	if actor.APIKeyID == nil || actor.ProjectID == nil {
		apperrors.Abort(c, http.StatusUnauthorized, "api_key_required", "ingest requires a project API key (X-Primora-Key)")
		return
	}
	raw, err := c.GetRawData()
	if err != nil {
		apperrors.Abort(c, http.StatusBadRequest, "bad_request", "unreadable body")
		return
	}
	var events []services.IngestEventInput
	var batch struct {
		Events []services.IngestEventInput `json:"events"`
	}
	if err := json.Unmarshal(raw, &batch); err == nil && len(batch.Events) > 0 {
		events = batch.Events
	} else {
		var single services.IngestEventInput
		if err := json.Unmarshal(raw, &single); err != nil || single.Type == "" {
			apperrors.Abort(c, http.StatusBadRequest, "bad_request", "expected {type,...} or {events:[...]}")
			return
		}
		events = []services.IngestEventInput{single}
	}
	if len(events) > 500 {
		apperrors.Abort(c, http.StatusRequestEntityTooLarge, "too_many_events", "max 500 events per batch")
		return
	}
	accepted, err := h.Platform.IngestEvents(c.Request.Context(), actor, events)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusAccepted, gin.H{"accepted": accepted})
}

func (h *HTTPHandler) listEvents(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	f := services.EventListFilters{
		Type:        strings.TrimSpace(c.Query("type")),
		Component:   strings.TrimSpace(c.Query("component")),
		Fingerprint: strings.TrimSpace(c.Query("fingerprint")),
	}
	if v, err := strconv.ParseInt(c.Query("before"), 10, 64); err == nil && v > 0 {
		f.Before = &v
	}
	if v, err := strconv.Atoi(c.Query("limit")); err == nil {
		f.Limit = v
	}
	result, err := h.Platform.ListEvents(c.Request.Context(), actor, projectID, f)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": result})
}

func (h *HTTPHandler) listIssues(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))
	result, err := h.Platform.ListIssues(c.Request.Context(), actor, projectID, days)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": result})
}

func (h *HTTPHandler) listComponents(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	result, err := h.Platform.ListComponents(c.Request.Context(), actor, projectID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": result})
}

func (h *HTTPHandler) deleteComponent(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	componentID, ok := parseUUIDParam(c, "componentID")
	if !ok {
		return
	}
	if err := h.Platform.DeleteComponent(c.Request.Context(), actor, projectID, componentID); err != nil {
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) telemetryStats(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	result, err := h.Platform.TelemetryStats(c.Request.Context(), actor, projectID, c.DefaultQuery("window", "24h"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *HTTPHandler) metricSeries(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	result, err := h.Platform.MetricSeriesData(c.Request.Context(), actor, projectID,
		strings.TrimSpace(c.Query("name")), c.DefaultQuery("window", "24h"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": result})
}

func (h *HTTPHandler) telemetryStream(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	ch, err := h.Platform.SubscribeTelemetry(c.Request.Context(), actor, projectID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	defer h.Platform.UnsubscribeTelemetry(projectID, ch)

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("X-Accel-Buffering", "no")
	c.Status(http.StatusOK)
	if _, err := c.Writer.WriteString(": connected\n\n"); err == nil {
		c.Writer.Flush()
	}

	keepalive := time.NewTicker(25 * time.Second)
	defer keepalive.Stop()

	c.Stream(func(w io.Writer) bool {
		select {
		case msg, ok := <-ch:
			if !ok {
				return false
			}
			c.SSEvent("event", json.RawMessage(msg))
			return true
		case <-keepalive.C:
			c.SSEvent("ping", "keepalive")
			return true
		case <-c.Request.Context().Done():
			return false
		}
	})
}
