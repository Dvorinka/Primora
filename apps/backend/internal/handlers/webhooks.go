package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/tdvorak/primora/apps/backend/internal/middleware"
	"github.com/tdvorak/primora/apps/backend/internal/models"
	apperrors "github.com/tdvorak/primora/apps/backend/internal/response"
	"github.com/tdvorak/primora/apps/backend/internal/services"
)

// actorProjectWebhook resolves the actor, :projectID and :webhookID.
func (h *HTTPHandler) actorProjectWebhook(c *gin.Context) (*models.Actor, uuid.UUID, uuid.UUID, bool) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return nil, uuid.Nil, uuid.Nil, false
	}
	webhookID, ok := parseUUIDParam(c, "webhookID")
	if !ok {
		return nil, uuid.Nil, uuid.Nil, false
	}
	return actor, projectID, webhookID, true
}

func (h *HTTPHandler) webhookError(c *gin.Context, err error) {
	if errors.Is(err, pgx.ErrNoRows) {
		apperrors.Abort(c, http.StatusNotFound, "not_found", "webhook not found")
		return
	}
	msg := err.Error()
	if strings.Contains(msg, "already exists") {
		apperrors.Abort(c, http.StatusConflict, "url_conflict", msg)
		return
	}
	h.handleError(c, err)
}

func (h *HTTPHandler) listWebhooks(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	result, err := h.Platform.ListWebhooks(c.Request.Context(), actor, projectID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": result})
}

func (h *HTTPHandler) createWebhook(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	var body services.CreateWebhookInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.CreateWebhook(c.Request.Context(), actor, projectID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		h.webhookError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *HTTPHandler) updateWebhook(c *gin.Context) {
	actor, projectID, webhookID, ok := h.actorProjectWebhook(c)
	if !ok {
		return
	}
	var body services.UpdateWebhookInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.UpdateWebhook(c.Request.Context(), actor, projectID, webhookID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		h.webhookError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *HTTPHandler) deleteWebhook(c *gin.Context) {
	actor, projectID, webhookID, ok := h.actorProjectWebhook(c)
	if !ok {
		return
	}
	if err := h.Platform.DeleteWebhook(c.Request.Context(), actor, projectID, webhookID, middleware.RequestIDFromContext(c)); err != nil {
		h.webhookError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) listWebhookDeliveries(c *gin.Context) {
	actor, projectID, webhookID, ok := h.actorProjectWebhook(c)
	if !ok {
		return
	}
	limit, ok := parsePaginationQuery(c, "limit", 50, 1, 200)
	if !ok {
		return
	}
	result, err := h.Platform.ListWebhookDeliveries(c.Request.Context(), actor, projectID, webhookID, limit)
	if err != nil {
		h.webhookError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": result})
}

func (h *HTTPHandler) testWebhook(c *gin.Context) {
	actor, projectID, webhookID, ok := h.actorProjectWebhook(c)
	if !ok {
		return
	}
	result, err := h.Platform.TestWebhook(c.Request.Context(), actor, projectID, webhookID, middleware.RequestIDFromContext(c))
	if err != nil {
		h.webhookError(c, err)
		return
	}
	c.JSON(http.StatusAccepted, result)
}

func (h *HTTPHandler) createDeployMarker(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	var body services.CreateDeployMarkerInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.CreateDeployMarker(c.Request.Context(), actor, projectID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		if strings.Contains(err.Error(), "required") {
			apperrors.Abort(c, http.StatusBadRequest, "bad_request", err.Error())
			return
		}
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}
