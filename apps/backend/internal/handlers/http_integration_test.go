// +build integration

package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/tdvorak/primora/apps/backend/internal/handlers"
	"github.com/tdvorak/primora/apps/backend/internal/observability"
	"github.com/tdvorak/primora/apps/backend/internal/repositories"
	"github.com/tdvorak/primora/apps/backend/internal/services"
	"github.com/tdvorak/primora/apps/backend/internal/storage"
)

// Integration tests require a running PostgreSQL instance
// Run with: go test -tags=integration ./...

func TestHealthEndpoints(t *testing.T) {
	router := setupTestRouter(t)

	t.Run("liveness check", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/health/liveness", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		
		var response map[string]any
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, "ok", response["status"])
	})

	t.Run("readiness check", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/health/readiness", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		
		var response map[string]any
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Contains(t, response, "status")
		assert.Contains(t, response, "checks")
	})
}

func TestAuthenticationFlow(t *testing.T) {
	router := setupTestRouter(t)

	t.Run("requires authentication", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/me", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("rejects invalid token", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/me", nil)
		req.Header.Set("Authorization", "Bearer invalid-token")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

func TestBootstrapFlow(t *testing.T) {
	router := setupTestRouter(t)

	// This test requires a valid JWT token
	// In a real integration test, you would:
	// 1. Create a test user in the auth service
	// 2. Get a valid JWT token
	// 3. Use that token to test the bootstrap endpoint

	t.Skip("Requires auth service integration")
}

func setupTestRouter(t *testing.T) *gin.Engine {
	gin.SetMode(gin.TestMode)
	
	// This would need to connect to a test database
	// For now, we'll create a minimal setup
	
	router := gin.New()
	
	// Create minimal dependencies
	store, err := storage.NewLocalStore(t.TempDir())
	require.NoError(t, err)
	
	// In a real integration test, you would:
	// - Connect to a test PostgreSQL database
	// - Run migrations
	// - Create a CoreRepository
	// - Create a PlatformService
	
	// For this example, we'll just set up the health endpoints
	metrics := observability.NewMetrics()
	
	handler := &handlers.HTTPHandler{
		Platform:  nil, // Would be initialized with real services
		Validate:  validator.New(),
		Metrics:   metrics,
		Readiness: func(c *gin.Context) map[string]any {
			return map[string]any{
				"status": "ok",
				"checks": map[string]any{
					"database":  "ok",
					"storage":   "ok",
					"dragonfly": "disabled",
				},
			}
		},
	}
	
	handler.Register(router)
	
	return router
}
