package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/tdvorak/primora/apps/backend/internal/database/db"
	"github.com/tdvorak/primora/apps/backend/internal/models"
)

// IntegrationCredentials is the secret payload stored AES-256-GCM encrypted in
// core.integrations.credentials. It is never serialized to the client — see
// IntegrationSummary.
type IntegrationCredentials struct {
	APIKey string `json:"api_key,omitempty"`
}

// IntegrationConfig holds non-secret connector settings (core.integrations.config).
type IntegrationConfig struct {
	SiteID string `json:"site_id,omitempty"`
}

type CreateIntegrationInput struct {
	Name    string `json:"name" validate:"required,min=1"`
	Type    string `json:"type" validate:"required,oneof=rybbit"`
	BaseURL string `json:"base_url" validate:"required,url"`
	APIKey  string `json:"api_key"`
	SiteID  string `json:"site_id"`
}

// IntegrationSummary is the client-facing shape — credentials reduced to a flag.
type IntegrationSummary struct {
	ID             uuid.UUID  `json:"id"`
	ProjectID      uuid.UUID  `json:"project_id"`
	Type           string     `json:"type"`
	Name           string     `json:"name"`
	BaseURL        string     `json:"base_url"`
	SiteID         string     `json:"site_id"`
	Status         string     `json:"status"`
	LastHealthAt   *time.Time `json:"last_health_at"`
	HasCredentials bool       `json:"has_credentials"`
	CreatedAt      time.Time  `json:"created_at"`
}

var integrationTypes = map[string]bool{"rybbit": true}

func parseIntegrationConfig(raw []byte) IntegrationConfig {
	var cfg IntegrationConfig
	_ = json.Unmarshal(raw, &cfg)
	return cfg
}

func toIntegrationSummary(row db.CoreIntegration) IntegrationSummary {
	cfg := parseIntegrationConfig(row.Config)
	out := IntegrationSummary{
		ID:             row.ID,
		ProjectID:      row.ProjectID,
		Type:           row.Type,
		Name:           row.Name,
		BaseURL:        row.BaseUrl,
		SiteID:         cfg.SiteID,
		Status:         row.Status,
		HasCredentials: len(row.Credentials) > 0,
		CreatedAt:      row.CreatedAt.Time,
	}
	if row.LastHealthAt.Valid {
		t := row.LastHealthAt.Time
		out.LastHealthAt = &t
	}
	return out
}

func normalizeBaseURL(raw string) (string, error) {
	trimmed := strings.TrimSpace(strings.TrimRight(raw, "/"))
	u, err := url.Parse(trimmed)
	if err != nil || (u.Scheme != "https" && u.Scheme != "http") || u.Host == "" {
		return "", errors.New("base_url must be an http(s) URL")
	}
	return trimmed, nil
}

func (s *PlatformService) decryptCredentials(row db.CoreIntegration) (IntegrationCredentials, error) {
	var creds IntegrationCredentials
	if len(row.Credentials) == 0 {
		return creds, nil
	}
	if s.enc == nil {
		return creds, errors.New("encryption not configured")
	}
	plain, err := s.enc.Decrypt(row.Credentials)
	if err != nil {
		return creds, fmt.Errorf("credentials unreadable: %w", err)
	}
	if err := json.Unmarshal(plain, &creds); err != nil {
		return creds, fmt.Errorf("credentials malformed: %w", err)
	}
	return creds, nil
}

func (s *PlatformService) integrationFor(ctx context.Context, actor *models.Actor, projectID, integrationID uuid.UUID, write bool) (db.CoreIntegration, error) {
	roles := []string{"admin", "developer", "viewer"}
	if write {
		roles = []string{"admin", "developer"}
	}
	if err := s.requireProjectRole(ctx, actor, projectID, roles...); err != nil {
		return db.CoreIntegration{}, err
	}
	row, err := s.repo.Queries().GetIntegrationByID(ctx, integrationID)
	if err != nil {
		return db.CoreIntegration{}, err
	}
	if row.ProjectID != projectID {
		return db.CoreIntegration{}, fmt.Errorf("integration access denied")
	}
	return row, nil
}

func (s *PlatformService) ListIntegrations(ctx context.Context, actor *models.Actor, projectID uuid.UUID) ([]IntegrationSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer", "viewer"); err != nil {
		return nil, err
	}
	rows, err := s.repo.Queries().ListIntegrations(ctx, projectID)
	if err != nil {
		return nil, err
	}
	out := make([]IntegrationSummary, 0, len(rows))
	for _, row := range rows {
		out = append(out, toIntegrationSummary(row))
	}
	return out, nil
}

func (s *PlatformService) CreateIntegration(ctx context.Context, actor *models.Actor, projectID uuid.UUID, input CreateIntegrationInput, requestID string) (IntegrationSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return IntegrationSummary{}, err
	}
	if !integrationTypes[input.Type] {
		return IntegrationSummary{}, fmt.Errorf("unsupported integration type %q", input.Type)
	}
	name := normalizeSlug(input.Name)
	if name == "" {
		return IntegrationSummary{}, errors.New("name must contain letters or digits")
	}
	baseURL, err := normalizeBaseURL(input.BaseURL)
	if err != nil {
		return IntegrationSummary{}, err
	}
	var credBytes []byte
	if strings.TrimSpace(input.APIKey) != "" {
		raw, _ := json.Marshal(IntegrationCredentials{APIKey: strings.TrimSpace(input.APIKey)})
		credBytes, err = s.enc.Encrypt(raw)
		if err != nil {
			return IntegrationSummary{}, err
		}
	}
	cfgBytes, _ := json.Marshal(IntegrationConfig{SiteID: strings.TrimSpace(input.SiteID)})
	var createdBy pgtype.UUID
	if actor.UserID != nil {
		createdBy = pgtype.UUID{Bytes: *actor.UserID, Valid: true}
	}
	row, err := s.repo.Queries().CreateIntegration(ctx, db.CreateIntegrationParams{
		ProjectID:       projectID,
		Type:            input.Type,
		Name:            name,
		BaseUrl:         baseURL,
		Config:          cfgBytes,
		Credentials:     credBytes,
		CreatedByUserID: createdBy,
	})
	if err != nil {
		if strings.Contains(err.Error(), "integrations_project_id_name_key") {
			return IntegrationSummary{}, fmt.Errorf("an integration named %s already exists", name)
		}
		return IntegrationSummary{}, err
	}
	project, err := s.repo.Queries().GetProjectByID(ctx, projectID)
	if err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "integration.created", "integration", row.ID.String(), map[string]any{
			"name": row.Name, "type": row.Type, "base_url": row.BaseUrl,
		}))
	}
	return toIntegrationSummary(row), nil
}

func (s *PlatformService) DeleteIntegration(ctx context.Context, actor *models.Actor, projectID, integrationID uuid.UUID, requestID string) error {
	row, err := s.integrationFor(ctx, actor, projectID, integrationID, true)
	if err != nil {
		return err
	}
	if _, err := s.repo.Queries().DeleteIntegration(ctx, db.DeleteIntegrationParams{
		ID:        integrationID,
		ProjectID: projectID,
	}); err != nil {
		return err
	}
	project, _ := s.repo.Queries().GetProjectByID(ctx, projectID)
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "integration.deleted", "integration", integrationID.String(), map[string]any{
		"name": row.Name, "type": row.Type,
	}))
	return nil
}

// integrationProbePath is the lightest authenticated endpoint per type; it
// verifies reachability and credentials in one request.
func integrationProbePath(integrationType string) string {
	if integrationType == "rybbit" {
		return "/api/organizations"
	}
	return "/"
}

func (s *PlatformService) TestIntegration(ctx context.Context, actor *models.Actor, projectID, integrationID uuid.UUID, requestID string) (map[string]any, error) {
	row, err := s.integrationFor(ctx, actor, projectID, integrationID, true)
	if err != nil {
		return nil, err
	}
	creds, err := s.decryptCredentials(row)
	if err != nil {
		return nil, err
	}

	status := "error"
	result := map[string]any{"ok": false}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, row.BaseUrl+integrationProbePath(row.Type), nil)
	if err == nil {
		if creds.APIKey != "" {
			req.Header.Set("Authorization", "Bearer "+creds.APIKey)
		}
		client := &http.Client{Timeout: 5 * time.Second}
		resp, reqErr := client.Do(req)
		if reqErr != nil {
			result["error"] = reqErr.Error()
		} else {
			defer resp.Body.Close()
			result["status_code"] = resp.StatusCode
			if resp.StatusCode >= 200 && resp.StatusCode < 400 {
				result["ok"] = true
				status = "ok"
			} else {
				result["error"] = fmt.Sprintf("unexpected status %d", resp.StatusCode)
				if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
					result["error"] = "credentials rejected"
				}
			}
		}
	} else {
		result["error"] = err.Error()
	}

	_ = s.repo.Queries().UpdateIntegrationHealth(ctx, db.UpdateIntegrationHealthParams{
		ID:     row.ID,
		Status: status,
	})
	if project, err := s.repo.Queries().GetProjectByID(ctx, projectID); err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "integration.tested", "integration", integrationID.String(), map[string]any{
			"name": row.Name, "status": status,
		}))
	}
	return result, nil
}
