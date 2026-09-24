package services

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	db "github.com/tdvorak/primora/apps/backend/internal/database/db"
	"github.com/tdvorak/primora/apps/backend/internal/models"
	"github.com/tdvorak/primora/apps/backend/internal/secrets"
)

// Project secrets are the server-side counterpart of the CLI's local vault:
// AES-256-GCM at rest, metadata-only listings, audited reveal. Job payloads
// reference them as secret://NAME — resolved at delivery, never stored in
// plaintext config.

var projectSecretNameRe = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

type ProjectSecretSummary struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	URL       string    `json:"url"`
	Notes     string    `json:"notes"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SetProjectSecretInput struct {
	Name  string  `json:"name"` // from the path param, not the body
	Value string  `json:"value" validate:"required"`
	URL   *string `json:"url"`
	Notes *string `json:"notes"`
}

type RevealProjectSecretResponse struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

func toProjectSecretSummary(row db.ListProjectSecretsRow) ProjectSecretSummary {
	return ProjectSecretSummary{
		ID:        row.ID,
		Name:      row.Name,
		URL:       row.Url,
		Notes:     row.Notes,
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}
}

func (s *PlatformService) ListProjectSecrets(ctx context.Context, actor *models.Actor, projectID uuid.UUID) ([]ProjectSecretSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer", "viewer"); err != nil {
		return nil, err
	}
	rows, err := s.repo.Queries().ListProjectSecrets(ctx, projectID)
	if err != nil {
		return nil, err
	}
	out := make([]ProjectSecretSummary, 0, len(rows))
	for _, row := range rows {
		out = append(out, toProjectSecretSummary(row))
	}
	return out, nil
}

func (s *PlatformService) SetProjectSecret(ctx context.Context, actor *models.Actor, projectID uuid.UUID, input SetProjectSecretInput, requestID string) (ProjectSecretSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return ProjectSecretSummary{}, err
	}
	name := strings.TrimSpace(input.Name)
	if !projectSecretNameRe.MatchString(name) {
		return ProjectSecretSummary{}, fmt.Errorf("invalid secret name — use env-var-safe names [A-Za-z_][A-Za-z0-9_]*")
	}
	if s.enc == nil {
		return ProjectSecretSummary{}, fmt.Errorf("encryption is not configured on this deployment")
	}
	ciphertext, err := s.enc.Encrypt([]byte(input.Value))
	if err != nil {
		return ProjectSecretSummary{}, err
	}
	// Merge url/notes over the existing row when the caller omits them —
	// `secrets set NAME` should not wipe metadata it never saw.
	var url, notes string
	if existing, err := s.repo.Queries().GetProjectSecret(ctx, db.GetProjectSecretParams{ProjectID: projectID, Name: name}); err == nil {
		url, notes = existing.Url, existing.Notes
	} else if err != pgx.ErrNoRows {
		return ProjectSecretSummary{}, err
	}
	if input.URL != nil {
		url = strings.TrimSpace(*input.URL)
	}
	if input.Notes != nil {
		notes = strings.TrimSpace(*input.Notes)
	}
	row, err := s.repo.Queries().UpsertProjectSecret(ctx, db.UpsertProjectSecretParams{
		ProjectID:  projectID,
		Name:       name,
		Ciphertext: ciphertext,
		Url:        url,
		Notes:      notes,
	})
	if err != nil {
		return ProjectSecretSummary{}, err
	}
	if project, err := s.repo.Queries().GetProjectByID(ctx, projectID); err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "secret.set", "project_secret", row.ID.String(), map[string]any{
			"name": row.Name,
		}))
	}
	return ProjectSecretSummary{
		ID:        row.ID,
		Name:      row.Name,
		URL:       row.Url,
		Notes:     row.Notes,
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}, nil
}

func (s *PlatformService) DeleteProjectSecret(ctx context.Context, actor *models.Actor, projectID uuid.UUID, name string, requestID string) error {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return err
	}
	row, err := s.repo.Queries().DeleteProjectSecret(ctx, db.DeleteProjectSecretParams{ProjectID: projectID, Name: name})
	if err != nil {
		return err
	}
	if project, err := s.repo.Queries().GetProjectByID(ctx, projectID); err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "secret.deleted", "project_secret", row.String(), map[string]any{
			"name": name,
		}))
	}
	return nil
}

// Reveal decrypts a single secret. Deliberately loud: audit-logged every time.
func (s *PlatformService) RevealProjectSecret(ctx context.Context, actor *models.Actor, projectID uuid.UUID, name string, requestID string) (RevealProjectSecretResponse, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return RevealProjectSecretResponse{}, err
	}
	row, err := s.repo.Queries().GetProjectSecret(ctx, db.GetProjectSecretParams{ProjectID: projectID, Name: name})
	if err != nil {
		return RevealProjectSecretResponse{}, err
	}
	plain, err := s.enc.Decrypt(row.Ciphertext)
	if err != nil {
		return RevealProjectSecretResponse{}, err
	}
	if project, err := s.repo.Queries().GetProjectByID(ctx, projectID); err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "secret.revealed", "project_secret", row.ID.String(), map[string]any{
			"name": row.Name,
		}))
	}
	return RevealProjectSecretResponse{Name: row.Name, Value: string(plain)}, nil
}

// resolveSecretRefs replaces "secret://NAME" string values in a payload with
// decrypted values. Names that do not resolve fail loudly — a literal
// secret:// string reaching the endpoint is worse than a failed run.
// Package-level so the JobScheduler can reuse it through its narrow repo iface.
func resolveSecretRefs(
	ctx context.Context,
	list func(context.Context, uuid.UUID) ([]db.ListProjectSecretValuesRow, error),
	enc *secrets.Encryptor,
	projectID uuid.UUID,
	payload json.RawMessage,
) (json.RawMessage, error) {
	if len(payload) == 0 || !strings.Contains(string(payload), "secret://") {
		return payload, nil
	}
	if enc == nil {
		return nil, fmt.Errorf("payload references project secrets but encryption is not configured on this deployment")
	}
	rows, err := list(ctx, projectID)
	if err != nil {
		return nil, err
	}
	values := make(map[string]string, len(rows))
	for _, row := range rows {
		plain, err := enc.Decrypt(row.Ciphertext)
		if err != nil {
			return nil, fmt.Errorf("project secret %q failed to decrypt", row.Name)
		}
		values[row.Name] = string(plain)
	}
	var doc any
	if err := json.Unmarshal(payload, &doc); err != nil {
		return nil, fmt.Errorf("payload is not valid JSON: %w", err)
	}
	var missing []string
	resolved := walkSecretRefs(doc, values, &missing)
	if len(missing) > 0 {
		return nil, fmt.Errorf("unresolved secret references: %s", strings.Join(missing, ", "))
	}
	out, err := json.Marshal(resolved)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func walkSecretRefs(node any, values map[string]string, missing *[]string) any {
	switch v := node.(type) {
	case string:
		if strings.HasPrefix(v, "secret://") {
			name := strings.TrimPrefix(v, "secret://")
			if resolved, ok := values[name]; ok {
				return resolved
			}
			*missing = append(*missing, name)
			return v
		}
		return v
	case map[string]any:
		for k, item := range v {
			v[k] = walkSecretRefs(item, values, missing)
		}
		return v
	case []any:
		for i, item := range v {
			v[i] = walkSecretRefs(item, values, missing)
		}
		return v
	default:
		return node
	}
}
