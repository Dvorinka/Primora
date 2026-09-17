package middleware

import (
	"net/http"
	"testing"

	"github.com/tdvorak/primora/apps/backend/internal/models"
)

func TestRequiredAPIKeyScope(t *testing.T) {
	cases := []struct {
		method, path, want string
	}{
		{http.MethodPost, "/api/v1/ingest", "ingest"},
		{http.MethodOptions, "/api/v1/ingest", "read"}, // preflight passes through CORS
		{http.MethodGet, "/api/v1/projects/x/events", "read"},
		{http.MethodGet, "/api/v1/projects/x/api-keys", "read"},
		{http.MethodPost, "/api/v1/projects/x/api-keys", "admin"},
		{http.MethodDelete, "/api/v1/projects/x/api-keys/y", "admin"},
		{http.MethodPatch, "/api/v1/projects/x/members/y", "admin"},
		{http.MethodPatch, "/api/v1/projects/x", "admin"},
		{http.MethodDelete, "/api/v1/projects/x", "admin"},
		{http.MethodPatch, "/api/v1/organizations/x", "admin"},
		{http.MethodDelete, "/api/v1/organizations/x", "admin"},
		{http.MethodPost, "/api/v1/organizations/x/invitations", "admin"},
		{http.MethodPost, "/api/v1/bootstrap", "admin"},
		{http.MethodPost, "/api/v1/projects/x/buckets", "write"},
		{http.MethodPost, "/api/v1/projects/x/db-connections/y/transfer", "write"},
		{http.MethodDelete, "/api/v1/buckets/x", "write"},
		{http.MethodPost, "/api/v1/projects/x/deploy-markers", "write"},
	}
	for _, tc := range cases {
		if got := requiredAPIKeyScope(tc.method, tc.path); got != tc.want {
			t.Errorf("%s %s: got %q, want %q", tc.method, tc.path, got, tc.want)
		}
	}
}

func TestActorHasScope(t *testing.T) {
	key := func(scopes ...string) *models.Actor {
		return &models.Actor{Type: models.ActorTypeAPIKey, Scopes: scopes}
	}
	user := &models.Actor{Type: models.ActorTypeUser}

	if !user.HasScope("admin") {
		t.Error("user actors bypass scope checks")
	}
	if !key("admin").HasScope("read") {
		t.Error("admin should satisfy every requirement")
	}
	if !key("write").HasScope("read") || !key("write").HasScope("ingest") {
		t.Error("write should imply read and ingest")
	}
	if key("write").HasScope("admin") {
		t.Error("write must not imply admin")
	}
	if key("read").HasScope("write") || key("read").HasScope("ingest") {
		t.Error("read must not imply write or ingest")
	}
	if !key("ingest").HasScope("ingest") || key("ingest").HasScope("read") {
		t.Error("ingest keys only reach /ingest")
	}
	if key().HasScope("read") {
		t.Error("scopeless key has no access")
	}
}
