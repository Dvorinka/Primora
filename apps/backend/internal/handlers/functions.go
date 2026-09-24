package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	apperrors "github.com/tdvorak/primora/apps/backend/internal/response"
	"github.com/tdvorak/primora/apps/backend/internal/middleware"
	"github.com/tdvorak/primora/apps/backend/internal/services"
)

func (h *HTTPHandler) listFunctions(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	items, err := h.Platform.ListFunctions(c.Request.Context(), actor, projectID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *HTTPHandler) createFunction(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	var body services.CreateFunctionInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	fn, err := h.Platform.CreateFunction(c.Request.Context(), actor, projectID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusCreated, fn)
}

func (h *HTTPHandler) getFunction(c *gin.Context) {
	actor, _, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	functionID, ok := parseUUIDParam(c, "functionID")
	if !ok {
		return
	}
	fn, code, err := h.Platform.GetFunctionCode(c.Request.Context(), actor, functionID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"function": fn, "code": code})
}

func (h *HTTPHandler) updateFunction(c *gin.Context) {
	actor, _, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	functionID, ok := parseUUIDParam(c, "functionID")
	if !ok {
		return
	}
	var body services.UpdateFunctionInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	fn, err := h.Platform.UpdateFunction(c.Request.Context(), actor, functionID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, fn)
}

func (h *HTTPHandler) deleteFunction(c *gin.Context) {
	actor, _, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	functionID, ok := parseUUIDParam(c, "functionID")
	if !ok {
		return
	}
	if err := h.Platform.DeleteFunction(c.Request.Context(), actor, functionID, middleware.RequestIDFromContext(c)); err != nil {
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) invokeFunction(c *gin.Context) {
	actor, _, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	functionID, ok := parseUUIDParam(c, "functionID")
	if !ok {
		return
	}
	var body struct {
		Payload json.RawMessage `json:"payload"`
	}
	// An empty body is a valid invoke — defaults to {}.
	if c.Request.Body != nil && c.Request.ContentLength > 0 {
		if err := c.ShouldBindJSON(&body); err != nil {
			apperrors.Abort(c, http.StatusBadRequest, "invalid_json", err.Error())
			return
		}
	}
	run, err := h.Platform.InvokeFunction(c.Request.Context(), actor, functionID, body.Payload, middleware.RequestIDFromContext(c))
	if err != nil {
		h.handleError(c, err)
		return
	}
	status := http.StatusOK
	if run.Status != "success" {
		status = http.StatusBadGateway
	}
	c.JSON(status, run)
}

func (h *HTTPHandler) listFunctionRuns(c *gin.Context) {
	actor, _, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	functionID, ok := parseUUIDParam(c, "functionID")
	if !ok {
		return
	}
	limit, _ := strconv.ParseInt(c.DefaultQuery("limit", "50"), 10, 64)
	runs, err := h.Platform.ListFunctionRuns(c.Request.Context(), actor, functionID, limit)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": runs})
}
