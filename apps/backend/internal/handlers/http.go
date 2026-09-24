package handlers

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	db "github.com/tdvorak/primora/apps/backend/internal/database/db"
	"github.com/tdvorak/primora/apps/backend/internal/middleware"
	"github.com/tdvorak/primora/apps/backend/internal/observability"
	apperrors "github.com/tdvorak/primora/apps/backend/internal/response"
	"github.com/tdvorak/primora/apps/backend/internal/services"
)

type HTTPHandler struct {
	Platform  *services.PlatformService
	Settings  *services.SettingsService
	Validate  *validator.Validate
	Metrics   *observability.Metrics
	Readiness func(*gin.Context) map[string]any
}

func (h *HTTPHandler) Register(router *gin.Engine) {
	router.GET("/api/v1/health/liveness", h.liveness)
	router.GET("/api/v1/health/readiness", h.readiness)
	router.GET("/api/v1/openapi.yaml", h.openapi)
	router.GET("/api/v1/metrics", h.metrics)

	api := router.Group("/api/v1")
	api.GET("/me", h.me)
	api.GET("/context", h.actorContext)
	api.GET("/instance/public", h.instancePublic)
	api.GET("/instance/settings", h.listInstanceSettings)
	api.PUT("/instance/settings/:key", h.updateInstanceSetting)
	api.DELETE("/instance/settings/:key", h.deleteInstanceSetting)
	api.POST("/bootstrap", h.bootstrap)
	api.GET("/organizations", h.organizations)
	api.POST("/organizations", h.createOrganization)
	api.PATCH("/organizations/:organizationID", h.updateOrganization)
	api.DELETE("/organizations/:organizationID", h.deleteOrganization)
	api.GET("/organizations/:organizationID/members", h.organizationMembers)
	api.PATCH("/organizations/:organizationID/members/:userID", h.updateOrganizationMemberRole)
	api.DELETE("/organizations/:organizationID/members/:userID", h.removeOrganizationMember)
	api.GET("/organizations/:organizationID/projects", h.projects)
	api.POST("/organizations/:organizationID/projects", h.createProject)
	api.GET("/organizations/:organizationID/invitations", h.invitations)
	api.POST("/organizations/:organizationID/invitations", h.createInvitation)
	api.DELETE("/organizations/:organizationID/invitations/:invitationID", h.revokeInvitation)
	api.POST("/invitations/accept", h.acceptInvitation)
	api.GET("/projects/:projectID/overview", h.projectOverview)
	api.GET("/projects/:projectID/api-keys", h.apiKeys)
	api.POST("/projects/:projectID/api-keys", h.createAPIKey)
	api.DELETE("/projects/:projectID/api-keys/:apiKeyID", h.revokeAPIKey)
	api.PATCH("/projects/:projectID", h.updateProject)
	api.DELETE("/projects/:projectID", h.deleteProject)
	api.GET("/projects/:projectID/members", h.projectMembers)
	api.PATCH("/projects/:projectID/members/:userID", h.updateProjectMemberRole)
	api.DELETE("/projects/:projectID/members/:userID", h.removeProjectMember)
	api.GET("/projects/:projectID/buckets", h.buckets)
	api.POST("/projects/:projectID/buckets", h.createBucket)
	api.PATCH("/buckets/:bucketID", h.updateBucket)
	api.DELETE("/buckets/:bucketID", h.deleteBucket)
	api.GET("/projects/:projectID/audit-logs", h.auditLogs)
	api.GET("/projects/:projectID/collections", h.listCollections)
	api.POST("/projects/:projectID/collections", h.createCollection)
	api.GET("/projects/:projectID/collections/:collectionID", h.getCollection)
	api.PATCH("/projects/:projectID/collections/:collectionID", h.updateCollection)
	api.DELETE("/projects/:projectID/collections/:collectionID", h.deleteCollection)
	api.GET("/collections/:collectionID/documents", h.listDocuments)
	api.POST("/collections/:collectionID/documents", h.createDocument)
	api.GET("/collections/:collectionID/documents/:documentID", h.getDocument)
	api.PATCH("/collections/:collectionID/documents/:documentID", h.updateDocument)
	api.DELETE("/collections/:collectionID/documents/:documentID", h.deleteDocument)
	api.OPTIONS("/ingest", h.ingestOptions)
	api.POST("/ingest", h.ingest)
	api.POST("/hooks/:token", h.receiveInboundHook)
	api.GET("/projects/:projectID/inbound-hooks", h.listInboundHooks)
	api.POST("/projects/:projectID/inbound-hooks", h.createInboundHook)
	api.DELETE("/projects/:projectID/inbound-hooks/:hookID", h.deleteInboundHook)
	api.GET("/projects/:projectID/emails", h.listEmailLog)
	api.GET("/projects/:projectID/functions", h.listFunctions)
	api.POST("/projects/:projectID/functions", h.createFunction)
	api.GET("/projects/:projectID/functions/:functionID", h.getFunction)
	api.PUT("/projects/:projectID/functions/:functionID", h.updateFunction)
	api.DELETE("/projects/:projectID/functions/:functionID", h.deleteFunction)
	api.POST("/projects/:projectID/functions/:functionID/invoke", h.invokeFunction)
	api.GET("/projects/:projectID/functions/:functionID/runs", h.listFunctionRuns)
	api.GET("/projects/:projectID/events", h.listEvents)
	api.POST("/projects/:projectID/events", h.publishEvent)
	api.GET("/projects/:projectID/issues", h.listIssues)
	api.GET("/projects/:projectID/components", h.listComponents)
	api.DELETE("/projects/:projectID/components/:componentID", h.deleteComponent)
	api.GET("/projects/:projectID/telemetry/stats", h.telemetryStats)
	api.GET("/projects/:projectID/telemetry/metrics/series", h.metricSeries)
	api.GET("/projects/:projectID/telemetry/stream", h.telemetryStream)
	api.GET("/db/status", h.dbxStatus)
	api.GET("/projects/:projectID/db-connections", h.listDBConnections)
	api.POST("/projects/:projectID/db-connections", h.createDBConnection)
	api.DELETE("/projects/:projectID/db-connections/:connectionID", h.deleteDBConnection)
	api.POST("/projects/:projectID/db-connections/:connectionID/test", h.testDBConnection)
	api.GET("/projects/:projectID/db-connections/:connectionID/databases", h.dbxDatabases)
	api.GET("/projects/:projectID/db-connections/:connectionID/tables", h.dbxTables)
	api.GET("/projects/:projectID/db-connections/:connectionID/describe", h.dbxDescribe)
	api.GET("/projects/:projectID/db-connections/:connectionID/schema", h.dbxSchema)
	api.GET("/projects/:projectID/db-connections/:connectionID/foreign-keys", h.dbxForeignKeys)
	api.POST("/projects/:projectID/db-connections/:connectionID/query", h.dbxQuery)
	api.POST("/projects/:projectID/db-connections/:connectionID/redis", h.dbxRedis)
	api.POST("/projects/:projectID/db-connections/:connectionID/transfer", h.dbxTransfer)
	api.GET("/projects/:projectID/integrations", h.listIntegrations)
	api.POST("/projects/:projectID/integrations", h.createIntegration)
	api.DELETE("/projects/:projectID/integrations/:integrationID", h.deleteIntegration)
	api.POST("/projects/:projectID/integrations/:integrationID/test", h.testIntegration)
	api.GET("/projects/:projectID/integrations/:integrationID/analytics", h.integrationAnalytics)
	api.GET("/projects/:projectID/webhooks", h.listWebhooks)
	api.POST("/projects/:projectID/webhooks", h.createWebhook)
	api.PATCH("/projects/:projectID/webhooks/:webhookID", h.updateWebhook)
	api.DELETE("/projects/:projectID/webhooks/:webhookID", h.deleteWebhook)
	api.GET("/projects/:projectID/webhooks/:webhookID/deliveries", h.listWebhookDeliveries)
	api.POST("/projects/:projectID/webhooks/:webhookID/test", h.testWebhook)
	api.POST("/projects/:projectID/deploy-markers", h.createDeployMarker)
	api.GET("/projects/:projectID/jobs", h.listJobs)
	api.POST("/projects/:projectID/jobs", h.createJob)
	api.PATCH("/projects/:projectID/jobs/:jobID", h.updateJob)
	api.DELETE("/projects/:projectID/jobs/:jobID", h.deleteJob)
	api.GET("/projects/:projectID/jobs/:jobID/runs", h.listJobRuns)
	api.POST("/projects/:projectID/jobs/:jobID/run", h.runJob)
	api.GET("/projects/:projectID/secrets", h.listProjectSecrets)
	api.PUT("/projects/:projectID/secrets/:name", h.setProjectSecret)
	api.DELETE("/projects/:projectID/secrets/:name", h.deleteProjectSecret)
	api.POST("/projects/:projectID/secrets/:name/reveal", h.revealProjectSecret)

	api.GET("/projects/:projectID/alerts", h.listAlertRules)
	api.POST("/projects/:projectID/alerts", h.createAlertRule)
	api.PUT("/projects/:projectID/alerts/:ruleID", h.updateAlertRule)
	api.DELETE("/projects/:projectID/alerts/:ruleID", h.deleteAlertRule)
	api.GET("/projects/:projectID/realtime/stream", h.realtimeStream)
	api.GET("/projects/:projectID/realtime/presence", h.realtimePresence)
	api.GET("/buckets/:bucketID/objects", h.listObjects)
	api.POST("/buckets/:bucketID/objects", h.uploadObject)
	api.POST("/buckets/:bucketID/object-copies", h.copyObject)
	api.POST("/buckets/:bucketID/object-presigns", h.presignObject)
	api.GET("/buckets/:bucketID/objects/*objectKey", h.downloadObject)
	api.PATCH("/buckets/:bucketID/objects/*objectKey", h.updateObject)
	api.DELETE("/buckets/:bucketID/objects/*objectKey", h.deleteObject)
}

func (h *HTTPHandler) liveness(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *HTTPHandler) readiness(c *gin.Context) {
	c.JSON(http.StatusOK, h.Readiness(c))
}

func (h *HTTPHandler) openapi(c *gin.Context) {
	c.File("openapi/openapi.yaml")
}

// metrics is intentionally unauthenticated — Prometheus scrapes it. Restrict
// it at the edge if the deployment is public-facing.
func (h *HTTPHandler) metrics(c *gin.Context) {
	c.Data(http.StatusOK, "text/plain; version=0.0.4; charset=utf-8", []byte(h.Metrics.RenderPrometheus()))
}

func (h *HTTPHandler) me(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	result, err := h.Platform.Me(c.Request.Context(), actor)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *HTTPHandler) actorContext(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	result, err := h.Platform.ActorContext(c.Request.Context(), actor)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *HTTPHandler) bootstrap(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	var body services.BootstrapInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.Bootstrap(c.Request.Context(), actor, body, middleware.RequestIDFromContext(c))
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *HTTPHandler) organizations(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	result, err := h.Platform.ListOrganizations(c.Request.Context(), actor)
	if err != nil {
		h.handleError(c, err)
		return
	}
	items := make([]organizationMembershipResponse, 0, len(result))
	for _, row := range result {
		items = append(items, toOrganizationMembershipResponse(row))
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *HTTPHandler) createOrganization(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	var body services.CreateOrganizationInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.CreateOrganization(c.Request.Context(), actor, body, middleware.RequestIDFromContext(c))
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toOrganizationMembershipResponseFromCore(result, "owner"))
}

func (h *HTTPHandler) deleteOrganization(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	organizationID, ok := parseUUIDParam(c, "organizationID")
	if !ok {
		return
	}
	if err := h.Platform.DeleteOrganization(c.Request.Context(), actor, organizationID, middleware.RequestIDFromContext(c)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "organization not found")
			return
		}
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) updateOrganization(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	organizationID, ok := parseUUIDParam(c, "organizationID")
	if !ok {
		return
	}
	var body services.UpdateOrganizationInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	if _, err := h.Platform.UpdateOrganization(c.Request.Context(), actor, organizationID, body, middleware.RequestIDFromContext(c)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "organization not found")
			return
		}
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) projects(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	organizationID, ok := parseUUIDParam(c, "organizationID")
	if !ok {
		return
	}
	query := strings.TrimSpace(c.Query("q"))
	result, err := h.Platform.ListProjects(c.Request.Context(), actor, organizationID, query)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": toProjectListResponse(result)})
}

func (h *HTTPHandler) organizationMembers(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	organizationID, ok := parseUUIDParam(c, "organizationID")
	if !ok {
		return
	}
	result, err := h.Platform.ListOrganizationMembers(c.Request.Context(), actor, organizationID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": result})
}

func (h *HTTPHandler) updateOrganizationMemberRole(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	organizationID, ok := parseUUIDParam(c, "organizationID")
	if !ok {
		return
	}
	userID, ok := parseUUIDParam(c, "userID")
	if !ok {
		return
	}
	var body services.UpdateOrganizationMemberRoleInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.UpdateOrganizationMemberRole(c.Request.Context(), actor, organizationID, userID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "organization member not found")
			return
		}
		if strings.Contains(err.Error(), "retain at least one") {
			apperrors.Abort(c, http.StatusConflict, "role_conflict", err.Error())
			return
		}
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *HTTPHandler) removeOrganizationMember(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	organizationID, ok := parseUUIDParam(c, "organizationID")
	if !ok {
		return
	}
	userID, ok := parseUUIDParam(c, "userID")
	if !ok {
		return
	}
	if err := h.Platform.RemoveOrganizationMember(c.Request.Context(), actor, organizationID, userID, middleware.RequestIDFromContext(c)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "organization member not found")
			return
		}
		if strings.Contains(err.Error(), "retain at least one") {
			apperrors.Abort(c, http.StatusConflict, "role_conflict", err.Error())
			return
		}
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) createProject(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	organizationID, ok := parseUUIDParam(c, "organizationID")
	if !ok {
		return
	}
	var body services.CreateProjectInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.CreateProject(c.Request.Context(), actor, organizationID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toProjectFromCore(result))
}

func (h *HTTPHandler) deleteProject(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	projectID, ok := parseUUIDParam(c, "projectID")
	if !ok {
		return
	}
	if err := h.Platform.DeleteProject(c.Request.Context(), actor, projectID, middleware.RequestIDFromContext(c)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "project not found")
			return
		}
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) updateProject(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	projectID, ok := parseUUIDParam(c, "projectID")
	if !ok {
		return
	}
	var body services.UpdateProjectInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	if _, err := h.Platform.UpdateProject(c.Request.Context(), actor, projectID, body, middleware.RequestIDFromContext(c)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "project not found")
			return
		}
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) createInvitation(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	organizationID, ok := parseUUIDParam(c, "organizationID")
	if !ok {
		return
	}
	var body services.CreateInvitationInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.CreateInvitation(c.Request.Context(), actor, organizationID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "project not found")
			return
		}
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *HTTPHandler) invitations(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	organizationID, ok := parseUUIDParam(c, "organizationID")
	if !ok {
		return
	}
	result, err := h.Platform.ListInvitations(c.Request.Context(), actor, organizationID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": result})
}

func (h *HTTPHandler) revokeInvitation(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	organizationID, ok := parseUUIDParam(c, "organizationID")
	if !ok {
		return
	}
	invitationID, ok := parseUUIDParam(c, "invitationID")
	if !ok {
		return
	}
	if err := h.Platform.RevokeInvitation(c.Request.Context(), actor, organizationID, invitationID, middleware.RequestIDFromContext(c)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "invitation not found")
			return
		}
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) acceptInvitation(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	var body services.AcceptInvitationInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	if err := h.Platform.AcceptInvitation(c.Request.Context(), actor, body, middleware.RequestIDFromContext(c)); err != nil {
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) projectOverview(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	projectID, ok := parseUUIDParam(c, "projectID")
	if !ok {
		return
	}
	result, err := h.Platform.GetProjectOverview(c.Request.Context(), actor, projectID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *HTTPHandler) apiKeys(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	projectID, ok := parseUUIDParam(c, "projectID")
	if !ok {
		return
	}
	result, err := h.Platform.ListAPIKeys(c.Request.Context(), actor, projectID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": toAPIKeyListResponse(result)})
}

func (h *HTTPHandler) createAPIKey(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	projectID, ok := parseUUIDParam(c, "projectID")
	if !ok {
		return
	}
	var body services.CreateAPIKeyInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.CreateAPIKey(c.Request.Context(), actor, projectID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *HTTPHandler) revokeAPIKey(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	projectID, ok := parseUUIDParam(c, "projectID")
	if !ok {
		return
	}
	apiKeyID, ok := parseUUIDParam(c, "apiKeyID")
	if !ok {
		return
	}
	if err := h.Platform.RevokeAPIKey(c.Request.Context(), actor, projectID, apiKeyID, middleware.RequestIDFromContext(c)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "api key not found")
			return
		}
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) projectMembers(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	projectID, ok := parseUUIDParam(c, "projectID")
	if !ok {
		return
	}
	result, err := h.Platform.ListProjectMembers(c.Request.Context(), actor, projectID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": result})
}

func (h *HTTPHandler) updateProjectMemberRole(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	projectID, ok := parseUUIDParam(c, "projectID")
	if !ok {
		return
	}
	userID, ok := parseUUIDParam(c, "userID")
	if !ok {
		return
	}
	var body services.UpdateProjectMemberRoleInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.UpdateProjectMemberRole(c.Request.Context(), actor, projectID, userID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "project member not found")
			return
		}
		if strings.Contains(err.Error(), "retain at least one") {
			apperrors.Abort(c, http.StatusConflict, "role_conflict", err.Error())
			return
		}
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *HTTPHandler) removeProjectMember(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	projectID, ok := parseUUIDParam(c, "projectID")
	if !ok {
		return
	}
	userID, ok := parseUUIDParam(c, "userID")
	if !ok {
		return
	}
	if err := h.Platform.RemoveProjectMember(c.Request.Context(), actor, projectID, userID, middleware.RequestIDFromContext(c)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "project member not found")
			return
		}
		if strings.Contains(err.Error(), "retain at least one") {
			apperrors.Abort(c, http.StatusConflict, "role_conflict", err.Error())
			return
		}
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) buckets(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	projectID, ok := parseUUIDParam(c, "projectID")
	if !ok {
		return
	}
	query := strings.TrimSpace(c.Query("q"))
	result, err := h.Platform.ListBuckets(c.Request.Context(), actor, projectID, query)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": toBucketListResponse(result)})
}

func (h *HTTPHandler) createBucket(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	projectID, ok := parseUUIDParam(c, "projectID")
	if !ok {
		return
	}
	var body services.CreateBucketInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.CreateBucket(c.Request.Context(), actor, projectID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toBucketResponse(result))
}

func (h *HTTPHandler) updateBucket(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	bucketID, ok := parseUUIDParam(c, "bucketID")
	if !ok {
		return
	}
	var body services.UpdateBucketInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	if _, err := h.Platform.UpdateBucket(c.Request.Context(), actor, bucketID, body, middleware.RequestIDFromContext(c)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "bucket not found")
			return
		}
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) deleteBucket(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	bucketID, ok := parseUUIDParam(c, "bucketID")
	if !ok {
		return
	}
	if err := h.Platform.DeleteBucket(c.Request.Context(), actor, bucketID, middleware.RequestIDFromContext(c)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "bucket not found")
			return
		}
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) listObjects(c *gin.Context) {
	bucketID, ok := parseUUIDParam(c, "bucketID")
	if !ok {
		return
	}
	limit, ok := parsePaginationQuery(c, "limit", 50, 1, 200)
	if !ok {
		return
	}
	offset, ok := parsePaginationQuery(c, "offset", 0, 0, 100000)
	if !ok {
		return
	}
	query := strings.TrimSpace(c.Query("q"))
	actor, _ := middleware.ActorFromContext(c)
	result, err := h.Platform.ListObjects(c.Request.Context(), actor, bucketID, query, limit, offset)
	if err != nil {
		h.handleError(c, err)
		return
	}
	total, err := h.Platform.CountObjects(c.Request.Context(), actor, bucketID, query)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"items":    toObjectListResponse(result),
		"total":    total,
		"limit":    limit,
		"offset":   offset,
		"has_more": int64(offset)+int64(len(result)) < total,
	})
}

func (h *HTTPHandler) uploadObject(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	bucketID, ok := parseUUIDParam(c, "bucketID")
	if !ok {
		return
	}
	fileHeader, err := c.FormFile("file")
	if err != nil {
		apperrors.Abort(c, http.StatusBadRequest, "invalid_file", "multipart file field `file` is required")
		return
	}
	objectKey := c.PostForm("objectKey")
	if objectKey == "" {
		objectKey = fileHeader.Filename
	}
	file, err := fileHeader.Open()
	if err != nil {
		h.handleError(c, err)
		return
	}
	defer file.Close()
	result, err := h.Platform.UploadObject(c.Request.Context(), actor, bucketID, strings.TrimPrefix(objectKey, "/"), fileHeader.Header.Get("Content-Type"), file, middleware.RequestIDFromContext(c))
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toObjectResponse(result))
}

func (h *HTTPHandler) copyObject(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	bucketID, ok := parseUUIDParam(c, "bucketID")
	if !ok {
		return
	}
	var body services.CopyObjectInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.CopyObject(c.Request.Context(), actor, bucketID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "bucket or object not found")
			return
		}
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toObjectResponse(result))
}

func (h *HTTPHandler) downloadObject(c *gin.Context) {
	bucketID, ok := parseUUIDParam(c, "bucketID")
	if !ok {
		return
	}
	objectKey := strings.TrimPrefix(c.Param("objectKey"), "/")
	actor, _ := middleware.ActorFromContext(c)
	object, reader, err := h.Platform.GetObject(c.Request.Context(), actor, bucketID, objectKey)
	if err != nil {
		h.handleError(c, err)
		return
	}
	defer reader.Close()
	c.Header("Content-Type", object.ContentType)
	c.Header("Content-Length", strconv.FormatInt(object.SizeBytes, 10))
	c.Header("ETag", object.ChecksumSha256)
	_, _ = io.Copy(c.Writer, reader)
}

func (h *HTTPHandler) updateObject(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	bucketID, ok := parseUUIDParam(c, "bucketID")
	if !ok {
		return
	}
	objectKey := strings.TrimPrefix(c.Param("objectKey"), "/")
	var body services.UpdateObjectInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	if _, err := h.Platform.UpdateObject(c.Request.Context(), actor, bucketID, objectKey, body, middleware.RequestIDFromContext(c)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "bucket or object not found")
			return
		}
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

type presignObjectRequest struct {
	Key        string `json:"key" validate:"required"`
	Op         string `json:"op" validate:"omitempty,oneof=download upload"`
	TTLSeconds int    `json:"ttl_seconds" validate:"omitempty,min=60,max=3600"`
}

// presignObject returns a short-lived URL clients call against storage
// directly — keeps large transfers off the backend. S3 driver only.
func (h *HTTPHandler) presignObject(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	bucketID, ok := parseUUIDParam(c, "bucketID")
	if !ok {
		return
	}
	var body presignObjectRequest
	if !h.bindAndValidate(c, &body) {
		return
	}
	out, err := h.Platform.PresignObject(c.Request.Context(), actor, bucketID, strings.TrimSpace(body.Key), body.Op, body.TTLSeconds)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "bucket or object not found")
			return
		}
		if errors.Is(err, services.ErrPresignUnsupported) {
			apperrors.Abort(c, http.StatusBadRequest, "presign_unsupported", err.Error())
			return
		}
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *HTTPHandler) deleteObject(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	bucketID, ok := parseUUIDParam(c, "bucketID")
	if !ok {
		return
	}
	if err := h.Platform.DeleteObject(c.Request.Context(), actor, bucketID, strings.TrimPrefix(c.Param("objectKey"), "/"), middleware.RequestIDFromContext(c)); err != nil {
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) auditLogs(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	projectID, ok := parseUUIDParam(c, "projectID")
	if !ok {
		return
	}
	limit, ok := parsePaginationQuery(c, "limit", 50, 1, 200)
	if !ok {
		return
	}
	offset, ok := parsePaginationQuery(c, "offset", 0, 0, 100000)
	if !ok {
		return
	}
	query := strings.TrimSpace(c.Query("q"))
	action := strings.TrimSpace(c.Query("action"))
	result, err := h.Platform.ListAuditLogs(c.Request.Context(), actor, projectID, query, action, limit, offset)
	if err != nil {
		h.handleError(c, err)
		return
	}
	total, err := h.Platform.CountAuditLogs(c.Request.Context(), actor, projectID, query, action)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"items":    toAuditLogListResponse(result),
		"total":    total,
		"limit":    limit,
		"offset":   offset,
		"has_more": int64(offset)+int64(len(result)) < total,
	})
}

func (h *HTTPHandler) listCollections(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	projectID, ok := parseUUIDParam(c, "projectID")
	if !ok {
		return
	}
	result, err := h.Platform.ListCollections(c.Request.Context(), actor, projectID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": toCollectionListResponse(result)})
}

func (h *HTTPHandler) createCollection(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	projectID, ok := parseUUIDParam(c, "projectID")
	if !ok {
		return
	}
	var body services.CreateCollectionInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.CreateCollection(c.Request.Context(), actor, projectID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toCollectionResponse(result))
}

func (h *HTTPHandler) getCollection(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	projectID, ok := parseUUIDParam(c, "projectID")
	if !ok {
		return
	}
	collectionID, ok := parseUUIDParam(c, "collectionID")
	if !ok {
		return
	}
	result, err := h.Platform.GetCollection(c.Request.Context(), actor, projectID, collectionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "collection not found")
			return
		}
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, toCollectionResponse(result))
}

func (h *HTTPHandler) updateCollection(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	projectID, ok := parseUUIDParam(c, "projectID")
	if !ok {
		return
	}
	collectionID, ok := parseUUIDParam(c, "collectionID")
	if !ok {
		return
	}
	var body services.UpdateCollectionInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.UpdateCollection(c.Request.Context(), actor, projectID, collectionID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "collection not found")
			return
		}
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, toCollectionResponse(result))
}

func (h *HTTPHandler) deleteCollection(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	projectID, ok := parseUUIDParam(c, "projectID")
	if !ok {
		return
	}
	collectionID, ok := parseUUIDParam(c, "collectionID")
	if !ok {
		return
	}
	if err := h.Platform.DeleteCollection(c.Request.Context(), actor, projectID, collectionID, middleware.RequestIDFromContext(c)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "collection not found")
			return
		}
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *HTTPHandler) listDocuments(c *gin.Context) {
	collectionID, ok := parseUUIDParam(c, "collectionID")
	if !ok {
		return
	}
	limit, ok := parsePaginationQuery(c, "limit", 50, 1, 200)
	if !ok {
		return
	}
	offset, ok := parsePaginationQuery(c, "offset", 0, 0, 100000)
	if !ok {
		return
	}
	actor, _ := middleware.ActorFromContext(c)
	var result []db.CoreDocument
	var total int64
	var err error
	// PostgREST-style filter/order switches to the dynamic-query path; the
	// plain list keeps using the sqlc queries it always has.
	if filter := c.Query("filter"); filter != "" || c.Query("order") != "" {
		result, total, err = h.Platform.SearchDocuments(c.Request.Context(), actor, collectionID, filter, c.Query("order"), limit, offset)
	} else {
		result, err = h.Platform.ListDocuments(c.Request.Context(), actor, collectionID, limit, offset)
		if err == nil {
			total, err = h.Platform.CountDocuments(c.Request.Context(), actor, collectionID)
		}
	}
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"items":    toDocumentListResponse(result),
		"total":    total,
		"limit":    limit,
		"offset":   offset,
		"has_more": int64(offset)+int64(len(result)) < total,
	})
}

func (h *HTTPHandler) createDocument(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	collectionID, ok := parseUUIDParam(c, "collectionID")
	if !ok {
		return
	}
	var body services.CreateDocumentInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.CreateDocument(c.Request.Context(), actor, collectionID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toDocumentResponse(result))
}

func (h *HTTPHandler) getDocument(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	collectionID, ok := parseUUIDParam(c, "collectionID")
	if !ok {
		return
	}
	documentID, ok := parseUUIDParam(c, "documentID")
	if !ok {
		return
	}
	result, err := h.Platform.GetDocument(c.Request.Context(), actor, collectionID, documentID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "document not found")
			return
		}
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, toDocumentResponse(result))
}

func (h *HTTPHandler) updateDocument(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	collectionID, ok := parseUUIDParam(c, "collectionID")
	if !ok {
		return
	}
	documentID, ok := parseUUIDParam(c, "documentID")
	if !ok {
		return
	}
	var body services.UpdateDocumentInput
	if !h.bindAndValidate(c, &body) {
		return
	}
	result, err := h.Platform.UpdateDocument(c.Request.Context(), actor, collectionID, documentID, body, middleware.RequestIDFromContext(c))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "document not found")
			return
		}
		h.handleError(c, err)
		return
	}
	c.JSON(http.StatusOK, toDocumentResponse(result))
}

func (h *HTTPHandler) deleteDocument(c *gin.Context) {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return
	}
	collectionID, ok := parseUUIDParam(c, "collectionID")
	if !ok {
		return
	}
	documentID, ok := parseUUIDParam(c, "documentID")
	if !ok {
		return
	}
	if err := h.Platform.DeleteDocument(c.Request.Context(), actor, collectionID, documentID, middleware.RequestIDFromContext(c)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			apperrors.Abort(c, http.StatusNotFound, "not_found", "document not found")
			return
		}
		h.handleError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func parsePaginationQuery(c *gin.Context, name string, defaultValue, minValue, maxValue int32) (int32, bool) {
	raw := strings.TrimSpace(c.Query(name))
	if raw == "" {
		return defaultValue, true
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		apperrors.Abort(c, http.StatusBadRequest, "invalid_query", "invalid "+name)
		return 0, false
	}
	intValue := int32(value)
	if intValue < minValue || intValue > maxValue {
		apperrors.Abort(c, http.StatusBadRequest, "invalid_query", name+" out of range")
		return 0, false
	}
	return intValue, true
}

func (h *HTTPHandler) bindAndValidate(c *gin.Context, target any) bool {
	if err := c.ShouldBindJSON(target); err != nil {
		apperrors.Abort(c, http.StatusBadRequest, "invalid_json", err.Error())
		return false
	}
	if err := h.Validate.Struct(target); err != nil {
		var valErrs validator.ValidationErrors
		if errors.As(err, &valErrs) && len(valErrs) > 0 {
			apperrors.Abort(c, http.StatusBadRequest, "validation_failed", formatFieldError(valErrs[0]))
		} else {
			apperrors.Abort(c, http.StatusBadRequest, "validation_failed", "invalid request body")
		}
		return false
	}
	return true
}

func formatFieldError(f validator.FieldError) string {
	if f.Tag() == "required" {
		return fmt.Sprintf("%s is required", strings.ToLower(f.Field()))
	}
	return fmt.Sprintf("%s failed %s validation", strings.ToLower(f.Field()), f.Tag())
}

func (h *HTTPHandler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, io.EOF):
		apperrors.Abort(c, http.StatusBadRequest, "invalid_body", "request body is empty")
	case errors.Is(err, pgx.ErrNoRows):
		apperrors.Abort(c, http.StatusNotFound, "not_found", "resource not found")
	default:
		var inputErr *services.InputError
		if errors.As(err, &inputErr) {
			apperrors.Abort(c, http.StatusBadRequest, "invalid_request", inputErr.Error())
			return
		}
		var valErrs validator.ValidationErrors
		if errors.As(err, &valErrs) && len(valErrs) > 0 {
			apperrors.Abort(c, http.StatusBadRequest, "invalid_request", formatFieldError(valErrs[0]))
			return
		}
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			// Structured codes — never leak raw SQLSTATE text or constraint names.
			switch pgErr.Code {
			case "23505":
				apperrors.Abort(c, http.StatusConflict, "conflict", "resource already exists")
			case "23503":
				apperrors.Abort(c, http.StatusConflict, "conflict", "referenced resource does not exist")
			case "22001", "54000":
				apperrors.Abort(c, http.StatusBadRequest, "invalid_request", "value too large")
			case "22021":
				apperrors.Abort(c, http.StatusBadRequest, "invalid_request", "input is not valid UTF-8")
			default:
				apperrors.Abort(c, http.StatusInternalServerError, "request_failed", "database error")
			}
			return
		}
		status := http.StatusInternalServerError
		message := strings.ToLower(err.Error())
		if strings.Contains(message, "insufficient") || strings.Contains(message, "access denied") {
			status = http.StatusForbidden
		}
		if strings.Contains(message, "already") || strings.Contains(message, "exists") || strings.Contains(message, "duplicate key") || strings.Contains(message, "unique") {
			status = http.StatusConflict
		}
		if strings.Contains(message, "expired") || strings.Contains(message, "invalid") {
			status = http.StatusBadRequest
		}
		apperrors.Abort(c, status, "request_failed", err.Error())
	}
}

func parseUUIDParam(c *gin.Context, name string) (uuid.UUID, bool) {
	value := c.Param(name)
	id, err := uuid.Parse(value)
	if err != nil {
		apperrors.Abort(c, http.StatusBadRequest, "invalid_id", "invalid "+name)
		return uuid.Nil, false
	}
	return id, true
}
