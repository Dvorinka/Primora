package handlers

import (
	"encoding/json"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"

	"github.com/tdvorak/primora/apps/backend/internal/middleware"
	apperrors "github.com/tdvorak/primora/apps/backend/internal/response"
	"github.com/tdvorak/primora/apps/backend/internal/services"
)

// instancePublic serves unauthenticated bootstrap state to the login page.
// It intentionally exposes only what the sign-in UI needs.
func (h *HTTPHandler) instancePublic(c *gin.Context) {
	users, err := h.Settings.AuthUserCount(c.Request.Context())
	if err != nil {
		apperrors.Abort(c, http.StatusInternalServerError, "settings_unavailable", err.Error())
		return
	}
	signupEnabled := false
	if users > 0 {
		signupEnabled, err = h.Settings.GetBool(c.Request.Context(), "auth.signup_enabled")
		if err != nil {
			apperrors.Abort(c, http.StatusInternalServerError, "settings_unavailable", err.Error())
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"signup_enabled":     signupEnabled,
		"bootstrap_required": users == 0,
		"social_providers":   managedSocialProviders(),
	})
}

// managedSocialProviders mirrors the auth service's managed gate: OAuth only
// exists when PRIMORA_MANAGED=true and the provider's client id is set.
func managedSocialProviders() []string {
	if os.Getenv("PRIMORA_MANAGED") != "true" {
		return []string{}
	}
	providers := []string{}
	for _, p := range []struct{ name, envKey string }{
		{"github", "GITHUB_CLIENT_ID"},
		{"google", "GOOGLE_CLIENT_ID"},
		{"discord", "DISCORD_CLIENT_ID"},
		{"microsoft", "MICROSOFT_CLIENT_ID"},
	} {
		if os.Getenv(p.envKey) != "" {
			providers = append(providers, p.name)
		}
	}
	return providers
}

// requireInstanceAdmin gates handlers on the platform admin role (better-auth
// `user.role`), which is distinct from org/project roles.
func (h *HTTPHandler) requireInstanceAdmin(c *gin.Context) bool {
	actor, ok := middleware.RequireActor(c)
	if !ok {
		return false
	}
	if !actor.IsUser() || !h.Settings.IsAdmin(c.Request.Context(), actor.AuthSubject) {
		apperrors.Abort(c, http.StatusForbidden, "admin_required", "instance admin role required")
		return false
	}
	return true
}

func (h *HTTPHandler) listInstanceSettings(c *gin.Context) {
	if !h.requireInstanceAdmin(c) {
		return
	}
	settings, err := h.Settings.ListResolved(c.Request.Context())
	if err != nil {
		apperrors.Abort(c, http.StatusInternalServerError, "settings_unavailable", err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{"settings": settings})
}

func (h *HTTPHandler) updateInstanceSetting(c *gin.Context) {
	if !h.requireInstanceAdmin(c) {
		return
	}
	key := c.Param("key")
	if _, ok := services.SettingSpecs[key]; !ok {
		apperrors.Abort(c, http.StatusNotFound, "unknown_setting", "unknown setting key")
		return
	}
	var body struct {
		Value json.RawMessage `json:"value" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || len(body.Value) == 0 {
		apperrors.Abort(c, http.StatusBadRequest, "invalid_body", "expected {\"value\": ...}")
		return
	}
	actor, _ := middleware.ActorFromContext(c)
	if err := h.Settings.Store(c.Request.Context(), key, body.Value, actor.Email); err != nil {
		apperrors.Abort(c, http.StatusBadRequest, "invalid_value", err.Error())
		return
	}
	value, source, err := h.Settings.Resolve(c.Request.Context(), key)
	if err != nil {
		apperrors.Abort(c, http.StatusInternalServerError, "settings_unavailable", err.Error())
		return
	}
	spec := services.SettingSpecs[key]
	resp := gin.H{"key": key, "type": spec.Type, "secret": spec.Secret, "is_set": true, "source": source}
	if !spec.Secret {
		resp["value"] = value
	}
	c.JSON(http.StatusOK, resp)
}

func (h *HTTPHandler) deleteInstanceSetting(c *gin.Context) {
	if !h.requireInstanceAdmin(c) {
		return
	}
	key := c.Param("key")
	if _, ok := services.SettingSpecs[key]; !ok {
		apperrors.Abort(c, http.StatusNotFound, "unknown_setting", "unknown setting key")
		return
	}
	if err := h.Settings.Delete(c.Request.Context(), key); err != nil {
		apperrors.Abort(c, http.StatusInternalServerError, "settings_unavailable", err.Error())
		return
	}
	c.Status(http.StatusNoContent)
}
