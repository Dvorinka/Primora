package handlers

import (
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/tdvorak/primora/apps/backend/internal/middleware"
	apperrors "github.com/tdvorak/primora/apps/backend/internal/response"
	"github.com/tdvorak/primora/apps/backend/internal/services"
)

const maxInboundBody = 256 * 1024 // external POSTs capped at 256 KiB

func (h *HTTPHandler) inboundError(c *gin.Context, err error) {
	if errors.Is(err, pgx.ErrNoRows) {
		apperrors.Abort(c, http.StatusNotFound, "not_found", "hook not found")
		return
	}
	msg := err.Error()
	switch {
	case strings.Contains(msg, "invalid signature"):
		apperrors.Abort(c, http.StatusUnauthorized, "unauthorized", msg)
	case strings.Contains(msg, "invalid") || strings.Contains(msg, "already exists") || strings.Contains(msg, "disabled") || strings.Contains(msg, "requires") || strings.Contains(msg, "not found in this project"):
		apperrors.Abort(c, http.StatusBadRequest, "bad_request", msg)
	default:
		h.handleError(c, err)
	}
}

func (h *HTTPHandler) listInboundHooks(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	result, err := h.Platform.ListInboundHooks(c.Request.Context(), actor, projectID)
	if err != nil {
		h.inboundError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": result})
}

func (h *HTTPHandler) createInboundHook(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	var body services.CreateInboundHookInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.CreateInboundHook(c.Request.Context(), actor, projectID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		h.inboundError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *HTTPHandler) deleteInboundHook(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	hookID, err := uuid.Parse(c.Param("hookID"))
	if err != nil {
		apperrors.Abort(c, http.StatusBadRequest, "bad_request", "invalid hook id")
		return
	}
	if err := h.Platform.DeleteInboundHook(c.Request.Context(), actor, projectID, hookID, middleware.RequestIDFromContext(c)); err != nil {
		h.inboundError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) listEmailLog(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	var limit int64
	if raw := c.Query("limit"); raw != "" {
		if n, err := strconv.ParseInt(raw, 10, 64); err == nil {
			limit = n
		}
	}
	result, err := h.Platform.ListEmailLog(c.Request.Context(), actor, projectID, limit)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": result})
}

// receiveInboundHook is the public ingest endpoint — the URL token is the
// credential, so no actor is required.
func (h *HTTPHandler) receiveInboundHook(c *gin.Context) {
	body, err := io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, maxInboundBody))
	if err != nil {
		apperrors.Abort(c, http.StatusRequestEntityTooLarge, "too_large", "body exceeds 256 KiB")
		return
	}
	result, err := h.Platform.ReceiveInboundHook(c.Request.Context(), c.Param("token"), c.GetHeader("X-Primora-Signature"), body)
	if err != nil {
		h.inboundError(c, err)
		return
	}
	c.JSON(http.StatusAccepted, result)
}
