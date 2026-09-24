package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/tdvorak/primora/apps/backend/internal/middleware"
	apperrors "github.com/tdvorak/primora/apps/backend/internal/response"
	"github.com/tdvorak/primora/apps/backend/internal/services"
)

func (h *HTTPHandler) alertError(c *gin.Context, err error) {
	if errors.Is(err, pgx.ErrNoRows) {
		apperrors.Abort(c, http.StatusNotFound, "not_found", "alert rule not found")
		return
	}
	msg := err.Error()
	if strings.Contains(msg, "invalid") || strings.Contains(msg, "must be") || strings.Contains(msg, "already exists") || strings.Contains(msg, "too long") {
		apperrors.Abort(c, http.StatusBadRequest, "bad_request", msg)
		return
	}
	h.handleError(c, err)
}

func (h *HTTPHandler) listAlertRules(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	result, err := h.Platform.ListAlertRules(c.Request.Context(), actor, projectID)
	if err != nil {
		h.alertError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": result})
}

func (h *HTTPHandler) createAlertRule(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	var body services.UpsertAlertRuleInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.CreateAlertRule(c.Request.Context(), actor, projectID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		h.alertError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *HTTPHandler) updateAlertRule(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	ruleID, err := uuid.Parse(c.Param("ruleID"))
	if err != nil {
		apperrors.Abort(c, http.StatusBadRequest, "bad_request", "invalid alert rule id")
		return
	}
	var body services.UpsertAlertRuleInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.UpdateAlertRule(c.Request.Context(), actor, projectID, ruleID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		h.alertError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *HTTPHandler) deleteAlertRule(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	ruleID, err := uuid.Parse(c.Param("ruleID"))
	if err != nil {
		apperrors.Abort(c, http.StatusBadRequest, "bad_request", "invalid alert rule id")
		return
	}
	if err := h.Platform.DeleteAlertRule(c.Request.Context(), actor, projectID, ruleID, middleware.RequestIDFromContext(c)); err != nil {
		h.alertError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
