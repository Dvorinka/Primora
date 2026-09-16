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

func (h *HTTPHandler) dbxStatus(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	result, err := h.Platform.DBXStatus(c.Request.Context(), actor)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *HTTPHandler) listDBConnections(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	result, err := h.Platform.ListDBConnections(c.Request.Context(), actor, projectID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": result})
}

func (h *HTTPHandler) createDBConnection(c *gin.Context) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return
	}
	var body services.CreateDBConnectionInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.CreateDBConnection(c.Request.Context(), actor, projectID, body, middleware.RequestIDFromContext(c))
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

func (h *HTTPHandler) deleteDBConnection(c *gin.Context) {
	actor, projectID, connectionID, ok := h.actorProjectConn(c)
	if !ok {
		return
	}
	if err := h.Platform.DeleteDBConnection(c.Request.Context(), actor, projectID, connectionID, middleware.RequestIDFromContext(c)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "connection not found")
			return
		}
		if strings.Contains(err.Error(), "platform-managed") {
			apperrors.Abort(c, http.StatusConflict, "managed_connection", err.Error())
			return
		}
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) testDBConnection(c *gin.Context) {
	actor, projectID, connectionID, ok := h.actorProjectConn(c)
	if !ok {
		return
	}
	result, err := h.Platform.TestDBConnection(c.Request.Context(), actor, projectID, connectionID)
	if err != nil {
		h.dbxError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *HTTPHandler) dbxDatabases(c *gin.Context) {
	actor, projectID, connectionID, ok := h.actorProjectConn(c)
	if !ok {
		return
	}
	result, err := h.Platform.ListDBXDatabases(c.Request.Context(), actor, projectID, connectionID)
	if err != nil {
		h.dbxError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *HTTPHandler) dbxTables(c *gin.Context) {
	actor, projectID, connectionID, ok := h.actorProjectConn(c)
	if !ok {
		return
	}
	result, err := h.Platform.ListDBXTables(c.Request.Context(), actor, projectID, connectionID,
		strings.TrimSpace(c.Query("database")), strings.TrimSpace(c.Query("schema")))
	if err != nil {
		h.dbxError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *HTTPHandler) dbxDescribe(c *gin.Context) {
	actor, projectID, connectionID, ok := h.actorProjectConn(c)
	if !ok {
		return
	}
	result, err := h.Platform.DescribeDBXTable(c.Request.Context(), actor, projectID, connectionID,
		strings.TrimSpace(c.Query("table")), strings.TrimSpace(c.Query("database")), strings.TrimSpace(c.Query("schema")))
	if err != nil {
		h.dbxError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *HTTPHandler) dbxSchema(c *gin.Context) {
	actor, projectID, connectionID, ok := h.actorProjectConn(c)
	if !ok {
		return
	}
	result, err := h.Platform.DBXSchemaContext(c.Request.Context(), actor, projectID, connectionID,
		strings.TrimSpace(c.Query("database")), strings.TrimSpace(c.Query("schema")))
	if err != nil {
		h.dbxError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *HTTPHandler) dbxForeignKeys(c *gin.Context) {
	actor, projectID, connectionID, ok := h.actorProjectConn(c)
	if !ok {
		return
	}
	result, err := h.Platform.ListDBXForeignKeys(c.Request.Context(), actor, projectID, connectionID,
		strings.TrimSpace(c.Query("database")), strings.TrimSpace(c.Query("schema")))
	if err != nil {
		h.dbxError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *HTTPHandler) dbxQuery(c *gin.Context) {
	actor, projectID, connectionID, ok := h.actorProjectConn(c)
	if !ok {
		return
	}
	var body struct {
		SQL      string `json:"sql" validate:"required"`
		Database string `json:"database"`
	}
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.ExecuteDBXQuery(c.Request.Context(), actor, projectID, connectionID, body.SQL, strings.TrimSpace(body.Database))
	if err != nil {
		h.dbxError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *HTTPHandler) dbxRedis(c *gin.Context) {
	actor, projectID, connectionID, ok := h.actorProjectConn(c)
	if !ok {
		return
	}
	var body struct {
		Command string `json:"command" validate:"required"`
		DB      *int   `json:"db"`
	}
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.ExecuteDBXRedis(c.Request.Context(), actor, projectID, connectionID, body.Command, body.DB)
	if err != nil {
		h.dbxError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// actorAndProject resolves the actor and :projectID param.
func (h *HTTPHandler) actorAndProject(c *gin.Context) (*models.Actor, uuid.UUID, bool) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return nil, uuid.Nil, false
	}
	projectID, ok := parseUUIDParam(c, "projectID")
	if !ok {
		return nil, uuid.Nil, false
	}
	return actor, projectID, true
}

// actorProjectConn resolves the actor, :projectID and :connectionID params.
func (h *HTTPHandler) actorProjectConn(c *gin.Context) (*models.Actor, uuid.UUID, uuid.UUID, bool) {
	actor, projectID, ok := h.actorAndProject(c)
	if !ok {
		return nil, uuid.Nil, uuid.Nil, false
	}
	connectionID, ok := parseUUIDParam(c, "connectionID")
	if !ok {
		return nil, uuid.Nil, uuid.Nil, false
	}
	return actor, projectID, connectionID, true
}

// dbxError maps DBX subprocess/tool failures to 502, not-found rows to 404.
func (h *HTTPHandler) dbxError(c *gin.Context, err error) {
	if errors.Is(err, pgx.ErrNoRows) {
		apperrors.Abort(c, http.StatusNotFound, "not_found", "connection not found")
		return
	}
	if strings.Contains(err.Error(), "access denied") || strings.Contains(err.Error(), "insufficient") || strings.Contains(err.Error(), "authentication required") {
		h.handleError(c, err)
		return
	}
	if strings.Contains(err.Error(), "table required") {
		apperrors.Abort(c, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	apperrors.Abort(c, http.StatusBadGateway, "dbx_error", err.Error())
}
