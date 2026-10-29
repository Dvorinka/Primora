package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/tdvorak/primora/apps/backend/internal/middleware"
	apperrors "github.com/tdvorak/primora/apps/backend/internal/response"
	"github.com/tdvorak/primora/apps/backend/internal/services"
)

func (h *HTTPHandler) loginError(c *gin.Context, err error) {
	msg := err.Error()
	if strings.Contains(msg, "invalid app id") || strings.Contains(msg, "username is required") {
		apperrors.Abort(c, http.StatusBadRequest, "bad_request", msg)
		return
	}
	h.secretError(c, err)
}

func (h *HTTPHandler) listProjectLogins(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	result, err := h.Platform.ListProjectLogins(c.Request.Context(), actor, projectID)
	if err != nil {
		h.loginError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": result})
}

func (h *HTTPHandler) setProjectLogin(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	var body services.SetProjectLoginInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	body.App = c.Param("app")
	result, err := h.Platform.SetProjectLogin(c.Request.Context(), actor, projectID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		h.loginError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *HTTPHandler) deleteProjectLogin(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	if err := h.Platform.DeleteProjectLogin(c.Request.Context(), actor, projectID, c.Param("app"), middleware.RequestIDFromContext(c)); err != nil {
		h.loginError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) revealProjectLogin(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	result, err := h.Platform.RevealProjectLogin(c.Request.Context(), actor, projectID, c.Param("app"), middleware.RequestIDFromContext(c))
	if err != nil {
		h.loginError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
