package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/tdvorak/primora/apps/backend/internal/middleware"
	"github.com/tdvorak/primora/apps/backend/internal/models"
	apperrors "github.com/tdvorak/primora/apps/backend/internal/response"
	"github.com/tdvorak/primora/apps/backend/internal/services"
)

// actorProjectIntegration resolves the actor, :projectID and :integrationID.
func (h *HTTPHandler) actorProjectIntegration(c *gin.Context) (*models.Actor, uuid.UUID, uuid.UUID, bool) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return nil, uuid.Nil, uuid.Nil, false
	}
	integrationID, ok := parseUUIDParam(c, "integrationID")
	if !ok {
		return nil, uuid.Nil, uuid.Nil, false
	}
	return actor, projectID, integrationID, true
}

func (h *HTTPHandler) integrationError(c *gin.Context, err error) {
	if errors.Is(err, pgx.ErrNoRows) {
		apperrors.Abort(c, http.StatusNotFound, "not_found", "integration not found")
		return
	}
	msg := err.Error()
	if strings.Contains(msg, "access denied") || strings.Contains(msg, "insufficient") || strings.Contains(msg, "authentication required") || strings.Contains(msg, "actor required") {
		h.handleError(c, err)
		return
	}
	if strings.Contains(msg, "rybbit") || strings.Contains(msg, "unreachable") {
		apperrors.Abort(c, http.StatusBadGateway, "integration_error", msg)
		return
	}
	h.handleError(c, err)
}

func (h *HTTPHandler) listIntegrations(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	result, err := h.Platform.ListIntegrations(c.Request.Context(), actor, projectID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": result})
}

func (h *HTTPHandler) createIntegration(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	var body services.CreateIntegrationInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.CreateIntegration(c.Request.Context(), actor, projectID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			apperrors.Abort(c, http.StatusConflict, "name_conflict", err.Error())
			return
		}
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *HTTPHandler) deleteIntegration(c *gin.Context) {
	actor, projectID, integrationID, ok := h.actorProjectIntegration(c)
	if !ok {
		return
	}
	if err := h.Platform.DeleteIntegration(c.Request.Context(), actor, projectID, integrationID, middleware.RequestIDFromContext(c)); err != nil {
		h.integrationError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) testIntegration(c *gin.Context) {
	actor, projectID, integrationID, ok := h.actorProjectIntegration(c)
	if !ok {
		return
	}
	result, err := h.Platform.TestIntegration(c.Request.Context(), actor, projectID, integrationID, middleware.RequestIDFromContext(c))
	if err != nil {
		h.integrationError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *HTTPHandler) integrationAnalytics(c *gin.Context) {
	actor, projectID, integrationID, ok := h.actorProjectIntegration(c)
	if !ok {
		return
	}
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))
	result, err := h.Platform.IntegrationAnalytics(c.Request.Context(), actor, projectID, integrationID,
		strings.TrimSpace(c.Query("site")), days)
	if err != nil {
		if strings.Contains(err.Error(), "site") || strings.Contains(err.Error(), "does not provide") || strings.Contains(err.Error(), "no credentials") {
			apperrors.Abort(c, http.StatusBadRequest, "bad_request", err.Error())
			return
		}
		h.integrationError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
