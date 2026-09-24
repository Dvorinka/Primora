package services

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/tdvorak/primora/apps/backend/internal/database/db"
	"github.com/tdvorak/primora/apps/backend/internal/models"
)

// Inbound hooks are project-scoped public ingest endpoints:
// POST /api/v1/hooks/<token>. A hook either republishes the body as an
// `inbound.received` domain event (webhooks + realtime fan out for free) or
// triggers a scheduled-job run with the body as the payload. When a secret is
// set, callers must sign the raw body with X-Primora-Signature — the same
// HMAC-SHA256 scheme outbound deliveries use.

const (
	WebhookEventInboundReceived = "inbound.received"

	InboundModeEvent = "event"
	InboundModeJob   = "job"
)

type InboundHookSummary struct {
	ID             string     `json:"id"`
	ProjectID      string     `json:"project_id"`
	Name           string     `json:"name"`
	Token          string     `json:"token"`
	URL            string     `json:"url"`
	Mode           string     `json:"mode"`
	JobID          string     `json:"job_id,omitempty"`
	HasSecret      bool       `json:"has_secret"`
	Enabled        bool       `json:"enabled"`
	LastReceivedAt *time.Time `json:"last_received_at"`
	CreatedAt      time.Time  `json:"created_at"`
}

type CreateInboundHookInput struct {
	Name    string    `json:"name" validate:"required"`
	Mode    string    `json:"mode"`
	JobID   string    `json:"job_id"`
	Secret  string    `json:"secret"`
	Enabled *bool     `json:"enabled"`
}

type InboundReceiveResult struct {
	Received bool   `json:"received"`
	Event    string `json:"event,omitempty"`
	RunID    string `json:"run_id,omitempty"`
}

func inboundHookSummary(row db.CoreInboundHook, publicURL string) InboundHookSummary {
	out := InboundHookSummary{
		ID:        row.ID.String(),
		ProjectID: row.ProjectID.String(),
		Name:      row.Name,
		Token:     row.Token,
		URL:       strings.TrimSuffix(publicURL, "/") + "/api/v1/hooks/" + row.Token,
		Mode:      row.Mode,
		HasSecret: len(row.Secret) > 0,
		Enabled:   row.Enabled,
		CreatedAt: row.CreatedAt.Time,
	}
	if row.JobID.Valid {
		out.JobID = uuid.UUID(row.JobID.Bytes).String()
	}
	if row.LastReceivedAt.Valid {
		t := row.LastReceivedAt.Time
		out.LastReceivedAt = &t
	}
	return out
}

func (s *PlatformService) ListInboundHooks(ctx context.Context, actor *models.Actor, projectID uuid.UUID) ([]InboundHookSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer", "viewer"); err != nil {
		return nil, err
	}
	rows, err := s.repo.Queries().ListInboundHooks(ctx, projectID)
	if err != nil {
		return nil, err
	}
	out := make([]InboundHookSummary, len(rows))
	for i, r := range rows {
		out[i] = inboundHookSummary(r, s.publicURL)
	}
	return out, nil
}

func (s *PlatformService) CreateInboundHook(ctx context.Context, actor *models.Actor, projectID uuid.UUID, input CreateInboundHookInput, requestID string) (InboundHookSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return InboundHookSummary{}, err
	}
	if !projectSecretNameRe.MatchString(input.Name) {
		return InboundHookSummary{}, fmt.Errorf("invalid hook name %q — use [A-Za-z_][A-Za-z0-9_]*", input.Name)
	}
	mode := input.Mode
	if mode == "" {
		mode = InboundModeEvent
	}
	var jobID pgtype.UUID
	if mode == InboundModeJob {
		parsed, err := uuid.Parse(input.JobID)
		if err != nil {
			return InboundHookSummary{}, errors.New("job mode requires a valid job_id")
		}
		job, err := s.repo.Queries().GetScheduledJobByID(ctx, parsed)
		if err != nil || job.ProjectID != projectID {
			return InboundHookSummary{}, errors.New("job not found in this project")
		}
		jobID = pgtype.UUID{Bytes: parsed, Valid: true}
	} else if mode != InboundModeEvent {
		return InboundHookSummary{}, fmt.Errorf("invalid mode %q — event or job", input.Mode)
	}
	secretBytes := []byte{}
	if input.Secret != "" {
		if s.enc == nil {
			return InboundHookSummary{}, errors.New("encryption is not configured — cannot store hook secrets")
		}
		var err error
		if secretBytes, err = s.enc.Encrypt([]byte(input.Secret)); err != nil {
			return InboundHookSummary{}, err
		}
	}
	token := "prm_hook_" + randHex(16)
	enabled := true
	if input.Enabled != nil {
		enabled = *input.Enabled
	}
	row, err := s.repo.Queries().CreateInboundHook(ctx, db.CreateInboundHookParams{
		ProjectID: projectID,
		Name:      input.Name,
		Token:     token,
		Mode:      mode,
		JobID:     jobID,
		Secret:    secretBytes,
		Enabled:   enabled,
	})
	if err != nil {
		if strings.Contains(err.Error(), "inbound_hooks_project_id_name_key") {
			return InboundHookSummary{}, fmt.Errorf("an inbound hook named %s already exists", input.Name)
		}
		return InboundHookSummary{}, err
	}
	project, err := s.repo.Queries().GetProjectByID(ctx, projectID)
	if err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "inbound_hook.created", "inbound_hook", row.ID.String(), map[string]any{
			"name": row.Name, "mode": row.Mode,
		}))
	}
	return inboundHookSummary(row, s.publicURL), nil
}

func (s *PlatformService) DeleteInboundHook(ctx context.Context, actor *models.Actor, projectID, hookID uuid.UUID, requestID string) error {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return err
	}
	if _, err := s.repo.Queries().GetInboundHook(ctx, db.GetInboundHookParams{ID: hookID, ProjectID: projectID}); err != nil {
		return err
	}
	if err := s.repo.Queries().DeleteInboundHook(ctx, db.DeleteInboundHookParams{ID: hookID, ProjectID: projectID}); err != nil {
		return err
	}
	project, err := s.repo.Queries().GetProjectByID(ctx, projectID)
	if err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "inbound_hook.deleted", "inbound_hook", hookID.String(), nil))
	}
	return nil
}

// ReceiveInboundHook handles POST /api/v1/hooks/:token — unauthenticated; the
// token is the credential. Signature check applies when a secret is set.
func (s *PlatformService) ReceiveInboundHook(ctx context.Context, token string, signature string, body []byte) (InboundReceiveResult, error) {
	hook, err := s.repo.Queries().GetInboundHookByToken(ctx, token)
	if err != nil {
		return InboundReceiveResult{}, err // pgx.ErrNoRows → 404
	}
	if !hook.Enabled {
		return InboundReceiveResult{}, errors.New("hook is disabled")
	}
	if len(hook.Secret) > 0 {
		if s.enc == nil {
			return InboundReceiveResult{}, errors.New("encryption is not configured")
		}
		plain, err := s.enc.Decrypt(hook.Secret)
		if err != nil {
			return InboundReceiveResult{}, err
		}
		want := "sha256=" + signBody(string(plain), body)
		if subtle.ConstantTimeCompare([]byte(signature), []byte(want)) != 1 {
			return InboundReceiveResult{}, errors.New("invalid signature")
		}
	}
	var payload map[string]any
	if len(body) > 0 {
		if err := json.Unmarshal(body, &payload); err != nil {
			return InboundReceiveResult{}, fmt.Errorf("invalid JSON body: %w", err)
		}
	}
	_ = s.repo.Queries().TouchInboundHook(ctx, hook.ID)

	switch hook.Mode {
	case InboundModeJob:
		if s.scheduler == nil {
			return InboundReceiveResult{}, errors.New("scheduler unavailable")
		}
		if !hook.JobID.Valid {
			return InboundReceiveResult{}, errors.New("hook has no job configured")
		}
		job, err := s.repo.Queries().GetScheduledJobByID(ctx, hook.JobID.Bytes)
		if err != nil {
			return InboundReceiveResult{}, err
		}
		if payload != nil {
			raw, _ := json.Marshal(payload)
			job.Payload = raw // received body replaces the configured payload
		}
		run, err := s.scheduler.enqueue(ctx, job, "hook")
		if err != nil {
			return InboundReceiveResult{}, err
		}
		return InboundReceiveResult{Received: true, Event: WebhookEventJobRun, RunID: run.ID.String()}, nil
	default:
		s.publishEvent(ctx, hook.ProjectID, WebhookEventInboundReceived, map[string]any{
			"hook_id":   hook.ID.String(),
			"hook_name": hook.Name,
			"payload":   payload,
		})
		return InboundReceiveResult{Received: true, Event: WebhookEventInboundReceived}, nil
	}
}

func randHex(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}
