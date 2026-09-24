package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"github.com/tdvorak/primora/apps/backend/internal/middleware"
	apperrors "github.com/tdvorak/primora/apps/backend/internal/response"
	"github.com/tdvorak/primora/apps/backend/internal/services"
)

func (h *HTTPHandler) secretError(c *gin.Context, err error) {
	if errors.Is(err, pgx.ErrNoRows) {
		apperrors.Abort(c, http.StatusNotFound, "not_found", "secret not found")
		return
	}
	msg := err.Error()
	if strings.Contains(msg, "invalid secret name") {
		apperrors.Abort(c, http.StatusBadRequest, "bad_request", msg)
		return
	}
	if strings.Contains(msg, "encryption is not configured") {
		apperrors.Abort(c, http.StatusServiceUnavailable, "unavailable", msg)
		return
	}
	h.handleError(c, err)
}

func (h *HTTPHandler) listProjectSecrets(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	result, err := h.Platform.ListProjectSecrets(c.Request.Context(), actor, projectID)
	if err != nil {
		h.secretError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": result})
}

func (h *HTTPHandler) setProjectSecret(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	var body services.SetProjectSecretInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	body.Name = c.Param("name")
	result, err := h.Platform.SetProjectSecret(c.Request.Context(), actor, projectID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		h.secretError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *HTTPHandler) deleteProjectSecret(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	if err := h.Platform.DeleteProjectSecret(c.Request.Context(), actor, projectID, c.Param("name"), middleware.RequestIDFromContext(c)); err != nil {
		h.secretError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) revealProjectSecret(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	result, err := h.Platform.RevealProjectSecret(c.Request.Context(), actor, projectID, c.Param("name"), middleware.RequestIDFromContext(c))
	if err != nil {
		h.secretError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
