package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/tdvorak/primora/apps/backend/internal/middleware"
	"github.com/tdvorak/primora/apps/backend/internal/models"
	apperrors "github.com/tdvorak/primora/apps/backend/internal/response"
	"github.com/tdvorak/primora/apps/backend/internal/services"
)

// actorProjectJob resolves the actor, :projectID and :jobID.
func (h *HTTPHandler) actorProjectJob(c *gin.Context) (*models.Actor, uuid.UUID, uuid.UUID, bool) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return nil, uuid.Nil, uuid.Nil, false
	}
	jobID, ok := parseUUIDParam(c, "jobID")
	if !ok {
		return nil, uuid.Nil, uuid.Nil, false
	}
	return actor, projectID, jobID, true
}

func (h *HTTPHandler) jobError(c *gin.Context, err error) {
	if errors.Is(err, pgx.ErrNoRows) {
		apperrors.Abort(c, http.StatusNotFound, "not_found", "job not found")
		return
	}
	msg := err.Error()
	if strings.Contains(msg, "already exists") {
		apperrors.Abort(c, http.StatusConflict, "name_conflict", msg)
		return
	}
	if strings.Contains(msg, "invalid schedule") || strings.Contains(msg, "schedule is required") || strings.Contains(msg, "https") {
		apperrors.Abort(c, http.StatusBadRequest, "bad_request", msg)
		return
	}
	h.handleError(c, err)
}

func (h *HTTPHandler) listJobs(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	result, err := h.Platform.ListScheduledJobs(c.Request.Context(), actor, projectID)
	if err != nil {
		h.jobError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": result})
}

func (h *HTTPHandler) createJob(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	var body services.CreateScheduledJobInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.CreateScheduledJob(c.Request.Context(), actor, projectID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		h.jobError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *HTTPHandler) updateJob(c *gin.Context) {
	actor, projectID, jobID, ok := h.actorProjectJob(c)
	if !ok {
		return
	}
	var body services.UpdateScheduledJobInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.UpdateScheduledJob(c.Request.Context(), actor, projectID, jobID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		h.jobError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *HTTPHandler) deleteJob(c *gin.Context) {
	actor, projectID, jobID, ok := h.actorProjectJob(c)
	if !ok {
		return
	}
	if err := h.Platform.DeleteScheduledJob(c.Request.Context(), actor, projectID, jobID, middleware.RequestIDFromContext(c)); err != nil {
		h.jobError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) listJobRuns(c *gin.Context) {
	actor, projectID, jobID, ok := h.actorProjectJob(c)
	if !ok {
		return
	}
	limit, ok := parsePaginationQuery(c, "limit", 50, 1, 200)
	if !ok {
		return
	}
	result, err := h.Platform.ListScheduledJobRuns(c.Request.Context(), actor, projectID, jobID, limit)
	if err != nil {
		h.jobError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": result})
}

func (h *HTTPHandler) runJob(c *gin.Context) {
	actor, projectID, jobID, ok := h.actorProjectJob(c)
	if !ok {
		return
	}
	result, err := h.Platform.RunScheduledJob(c.Request.Context(), actor, projectID, jobID, middleware.RequestIDFromContext(c))
	if err != nil {
		h.jobError(c, err)
		return
	}
	c.JSON(http.StatusAccepted, result)
}

// realtimeStream pushes project domain events (document/object/issue/job) to
// the dashboard over SSE — the same pattern as telemetryStream.
func (h *HTTPHandler) realtimeStream(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	ch, err := h.Platform.SubscribeRealtime(c.Request.Context(), actor, projectID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	defer h.Platform.UnsubscribeRealtime(projectID, ch)

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
