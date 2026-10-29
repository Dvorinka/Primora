package services

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	db "github.com/tdvorak/primora/apps/backend/internal/database/db"
	"github.com/tdvorak/primora/apps/backend/internal/models"
)

// Project logins are website and app accounts: a stable app id, a username,
// and a password. The app id survives port changes (localhost:3000 is not an
// identity). Passwords are AES-256-GCM at rest; reveal is audit-logged.

var loginAppRe = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$`)

type ProjectLoginSummary struct {
	ID        uuid.UUID `json:"id"`
	App       string    `json:"app"`
	Username  string    `json:"username"`
	Origin    string    `json:"origin"`
	Notes     string    `json:"notes"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SetProjectLoginInput struct {
	App      string  `json:"app"`
	Username string  `json:"username" validate:"required"`
	Password string  `json:"password" validate:"required"`
	Origin   *string `json:"origin"`
	Notes    *string `json:"notes"`
}

type RevealProjectLoginResponse struct {
	App      string `json:"app"`
	Username string `json:"username"`
	Password string `json:"password"`
	Origin   string `json:"origin"`
}

func validLoginApp(app string) bool {
	return loginAppRe.MatchString(app)
}

func toProjectLoginSummary(row db.ListProjectLoginsRow) ProjectLoginSummary {
	return ProjectLoginSummary{
		ID:        row.ID,
		App:       row.App,
		Username:  row.Username,
		Origin:    row.Origin,
		Notes:     row.Notes,
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}
}

func (s *PlatformService) ListProjectLogins(ctx context.Context, actor *models.Actor, projectID uuid.UUID) ([]ProjectLoginSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer", "viewer"); err != nil {
		return nil, err
	}
	rows, err := s.repo.Queries().ListProjectLogins(ctx, projectID)
	if err != nil {
		return nil, err
	}
	out := make([]ProjectLoginSummary, 0, len(rows))
	for _, row := range rows {
		out = append(out, toProjectLoginSummary(row))
	}
	return out, nil
}

func (s *PlatformService) SetProjectLogin(ctx context.Context, actor *models.Actor, projectID uuid.UUID, input SetProjectLoginInput, requestID string) (ProjectLoginSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return ProjectLoginSummary{}, err
	}
	app := strings.TrimSpace(input.App)
	if !validLoginApp(app) {
		return ProjectLoginSummary{}, fmt.Errorf("invalid app id — use [A-Za-z0-9][A-Za-z0-9._-]{0,63}, not a URL or port")
	}
	username := strings.TrimSpace(input.Username)
	if username == "" {
		return ProjectLoginSummary{}, fmt.Errorf("username is required")
	}
	if s.enc == nil {
		return ProjectLoginSummary{}, fmt.Errorf("encryption is not configured on this deployment")
	}
	ciphertext, err := s.enc.Encrypt([]byte(input.Password))
	if err != nil {
		return ProjectLoginSummary{}, err
	}
	var origin, notes string
	if existing, err := s.repo.Queries().GetProjectLogin(ctx, db.GetProjectLoginParams{ProjectID: projectID, App: app}); err == nil {
		origin, notes = existing.Origin, existing.Notes
	} else if err != pgx.ErrNoRows {
		return ProjectLoginSummary{}, err
	}
	if input.Origin != nil {
		origin = strings.TrimSpace(*input.Origin)
	}
	if input.Notes != nil {
		notes = strings.TrimSpace(*input.Notes)
	}
	row, err := s.repo.Queries().UpsertProjectLogin(ctx, db.UpsertProjectLoginParams{
		ProjectID:  projectID,
		App:        app,
		Username:   username,
		Ciphertext: ciphertext,
		Origin:     origin,
		Notes:      notes,
	})
	if err != nil {
		return ProjectLoginSummary{}, err
	}
	if project, err := s.repo.Queries().GetProjectByID(ctx, projectID); err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "login.set", "project_login", row.ID.String(), map[string]any{
			"app": row.App,
		}))
	}
	return ProjectLoginSummary{
		ID:        row.ID,
		App:       row.App,
		Username:  row.Username,
		Origin:    row.Origin,
		Notes:     row.Notes,
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}, nil
}

func (s *PlatformService) DeleteProjectLogin(ctx context.Context, actor *models.Actor, projectID uuid.UUID, app string, requestID string) error {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return err
	}
	row, err := s.repo.Queries().DeleteProjectLogin(ctx, db.DeleteProjectLoginParams{ProjectID: projectID, App: app})
	if err != nil {
		return err
	}
	if project, err := s.repo.Queries().GetProjectByID(ctx, projectID); err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "login.deleted", "project_login", row.String(), map[string]any{
			"app": app,
		}))
	}
	return nil
}

func (s *PlatformService) RevealProjectLogin(ctx context.Context, actor *models.Actor, projectID uuid.UUID, app string, requestID string) (RevealProjectLoginResponse, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return RevealProjectLoginResponse{}, err
	}
	if s.enc == nil {
		return RevealProjectLoginResponse{}, fmt.Errorf("encryption is not configured on this deployment")
	}
	row, err := s.repo.Queries().GetProjectLogin(ctx, db.GetProjectLoginParams{ProjectID: projectID, App: app})
	if err != nil {
		return RevealProjectLoginResponse{}, err
	}
	plain, err := s.enc.Decrypt(row.Ciphertext)
	if err != nil {
		return RevealProjectLoginResponse{}, err
	}
	if project, err := s.repo.Queries().GetProjectByID(ctx, projectID); err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "login.revealed", "project_login", row.ID.String(), map[string]any{
			"app": row.App,
		}))
	}
	return RevealProjectLoginResponse{App: row.App, Username: row.Username, Password: string(plain), Origin: row.Origin}, nil
}
