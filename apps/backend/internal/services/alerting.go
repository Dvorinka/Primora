package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	db "github.com/tdvorak/primora/apps/backend/internal/database/db"
	"github.com/tdvorak/primora/apps/backend/internal/models"
)

// Alert rules detect conditions in telemetry (component heartbeat silence,
// error-rate spikes) and fire `alert.fired` / `alert.resolved` domain events.
// Delivery reuses the webhook dispatcher + realtime stream — the evaluator is
// the only new machinery. Rules fire on state transitions only, so a flaky
// component produces one fired + one resolved, not a storm.

const (
	AlertEventFired    = "alert.fired"
	AlertEventResolved = "alert.resolved"

	AlertKindHeartbeatSilence = "heartbeat_silence"
	AlertKindErrorSpike       = "error_spike"
)

// AlertRuleConfig is the JSONB config per rule kind.
//
//	heartbeat_silence: component beats less often than ThresholdMinutes.
//	error_spike:       component logs more than ThresholdCount errors in
//	                   WindowMinutes.
// Component empty = evaluate every component in the project.
type AlertRuleConfig struct {
	Component        string `json:"component,omitempty"`
	ThresholdMinutes int    `json:"threshold_minutes,omitempty"`
	ThresholdCount   int64  `json:"threshold_count,omitempty"`
	WindowMinutes    int    `json:"window_minutes,omitempty"`
}

type AlertRuleSummary struct {
	ID        string          `json:"id"`
	ProjectID string          `json:"project_id"`
	Name      string          `json:"name"`
	Kind      string          `json:"kind"`
	Config    AlertRuleConfig `json:"config"`
	Enabled   bool            `json:"enabled"`
	Firing    []string        `json:"firing"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

type UpsertAlertRuleInput struct {
	Name    string          `json:"name" validate:"required"`
	Kind    string          `json:"kind" validate:"required"`
	Config  AlertRuleConfig `json:"config"`
	Enabled *bool           `json:"enabled"`
}

func (s *PlatformService) validateAlertRule(input UpsertAlertRuleInput) (AlertRuleConfig, error) {
	if !projectSecretNameRe.MatchString(input.Name) {
		return AlertRuleConfig{}, fmt.Errorf("invalid alert rule name %q — use [A-Za-z_][A-Za-z0-9_]*", input.Name)
	}
	cfg := input.Config
	switch input.Kind {
	case AlertKindHeartbeatSilence:
		if cfg.ThresholdMinutes < 1 || cfg.ThresholdMinutes > 10080 {
			return cfg, errors.New("threshold_minutes must be 1–10080")
		}
	case AlertKindErrorSpike:
		if cfg.ThresholdCount < 1 {
			return cfg, errors.New("threshold_count must be ≥ 1")
		}
		if cfg.WindowMinutes == 0 {
			cfg.WindowMinutes = 15
		}
		if cfg.WindowMinutes < 1 || cfg.WindowMinutes > 1440 {
			return cfg, errors.New("window_minutes must be 1–1440")
		}
	default:
		return cfg, fmt.Errorf("invalid kind %q — %s or %s", input.Kind, AlertKindHeartbeatSilence, AlertKindErrorSpike)
	}
	if cfg.Component != "" && len(cfg.Component) > 128 {
		return cfg, errors.New("component name too long")
	}
	return cfg, nil
}

func alertRuleSummary(row db.CoreAlertRule) AlertRuleSummary {
	var cfg AlertRuleConfig
	_ = json.Unmarshal(row.Config, &cfg)
	firing := parseFiring(row.State)
	return AlertRuleSummary{
		ID:        row.ID.String(),
		ProjectID: row.ProjectID.String(),
		Name:      row.Name,
		Kind:      row.Kind,
		Config:    cfg,
		Enabled:   row.Enabled,
		Firing:    firing.list(),
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}
}

func (s *PlatformService) ListAlertRules(ctx context.Context, actor *models.Actor, projectID uuid.UUID) ([]AlertRuleSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer", "viewer"); err != nil {
		return nil, err
	}
	rows, err := s.repo.Queries().ListAlertRules(ctx, projectID)
	if err != nil {
		return nil, err
	}
	out := make([]AlertRuleSummary, len(rows))
	for i, r := range rows {
		out[i] = alertRuleSummary(r)
	}
	return out, nil
}

func (s *PlatformService) CreateAlertRule(ctx context.Context, actor *models.Actor, projectID uuid.UUID, input UpsertAlertRuleInput, requestID string) (AlertRuleSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return AlertRuleSummary{}, err
	}
	cfg, err := s.validateAlertRule(input)
	if err != nil {
		return AlertRuleSummary{}, err
	}
	rawCfg, _ := json.Marshal(cfg)
	row, err := s.repo.Queries().CreateAlertRule(ctx, db.CreateAlertRuleParams{
		ProjectID: projectID,
		Name:      input.Name,
		Kind:      input.Kind,
		Config:    rawCfg,
	})
	if err != nil {
		if strings.Contains(err.Error(), "alert_rules_project_id_name_key") {
			return AlertRuleSummary{}, fmt.Errorf("an alert rule named %s already exists", input.Name)
		}
		return AlertRuleSummary{}, err
	}
	s.auditAlert(ctx, actor, projectID, requestID, "alert.created", row.ID, input.Name)
	return alertRuleSummary(row), nil
}

func (s *PlatformService) UpdateAlertRule(ctx context.Context, actor *models.Actor, projectID, ruleID uuid.UUID, input UpsertAlertRuleInput, requestID string) (AlertRuleSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return AlertRuleSummary{}, err
	}
	if _, err := s.repo.Queries().GetAlertRule(ctx, db.GetAlertRuleParams{ID: ruleID, ProjectID: projectID}); err != nil {
		return AlertRuleSummary{}, err // pgx.ErrNoRows → 404 at the handler
	}
	cfg, err := s.validateAlertRule(input)
	if err != nil {
		return AlertRuleSummary{}, err
	}
	enabled := true
	if input.Enabled != nil {
		enabled = *input.Enabled
	}
	rawCfg, _ := json.Marshal(cfg)
	row, err := s.repo.Queries().UpdateAlertRule(ctx, db.UpdateAlertRuleParams{
		ID: ruleID, ProjectID: projectID, Name: input.Name, Config: rawCfg, Enabled: enabled,
	})
	if err != nil {
		return AlertRuleSummary{}, err
	}
	s.auditAlert(ctx, actor, projectID, requestID, "alert.updated", row.ID, input.Name)
	return alertRuleSummary(row), nil
}

func (s *PlatformService) DeleteAlertRule(ctx context.Context, actor *models.Actor, projectID, ruleID uuid.UUID, requestID string) error {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return err
	}
	if _, err := s.repo.Queries().GetAlertRule(ctx, db.GetAlertRuleParams{ID: ruleID, ProjectID: projectID}); err != nil {
		return err
	}
	if err := s.repo.Queries().DeleteAlertRule(ctx, db.DeleteAlertRuleParams{ID: ruleID, ProjectID: projectID}); err != nil {
		return err
	}
	s.auditAlert(ctx, actor, projectID, requestID, "alert.deleted", ruleID, "")
	return nil
}

func (s *PlatformService) auditAlert(ctx context.Context, actor *models.Actor, projectID uuid.UUID, requestID, action string, ruleID uuid.UUID, name string) {
	project, err := s.repo.Queries().GetProjectByID(ctx, projectID)
	if err != nil {
		return
	}
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, action, "alert_rule", ruleID.String(), map[string]any{"name": name}))
}

// ---------------------------------------------------------------------------
// evaluator — one ticker per backend, transition-based firing
// ---------------------------------------------------------------------------

type firingSet map[string]bool

func parseFiring(raw []byte) firingSet {
	var state struct {
		Firing map[string]bool `json:"firing"`
	}
	if err := json.Unmarshal(raw, &state); err != nil || state.Firing == nil {
		return firingSet{}
	}
	return state.Firing
}

func (f firingSet) list() []string {
	out := make([]string, 0, len(f))
	for name, on := range f {
		if on {
			out = append(out, name)
		}
	}
	return out
}

// alertQueries is the slice of db.Queries the evaluator needs — narrow so
// tests can stub it without a database.
type alertQueries interface {
	ListEnabledAlertRules(ctx context.Context) ([]db.CoreAlertRule, error)
	LastHeartbeats(ctx context.Context, projectID uuid.UUID) ([]db.LastHeartbeatsRow, error)
	RecentErrorCounts(ctx context.Context, arg db.RecentErrorCountsParams) ([]db.RecentErrorCountsRow, error)
	SetAlertRuleState(ctx context.Context, arg db.SetAlertRuleStateParams) error
}

type alertEvaluator struct {
	q       alertQueries
	publish func(ctx context.Context, projectID uuid.UUID, eventType string, data map[string]any)
	logger  *slog.Logger
	tick    time.Duration
	quit    chan struct{}
	wg      sync.WaitGroup
	started sync.Once
	leader  *leaderState
}

func newAlertEvaluator(q alertQueries, publish func(ctx context.Context, projectID uuid.UUID, eventType string, data map[string]any), logger *slog.Logger, pool *pgxpool.Pool) *alertEvaluator {
	return &alertEvaluator{q: q, publish: publish, logger: logger, tick: time.Minute, quit: make(chan struct{}), leader: newLeaderState(pool, leaderKeyAlerts)}
}

func (e *alertEvaluator) Start(ctx context.Context) {
	e.started.Do(func() {
		e.wg.Add(1)
		go func() {
			defer e.wg.Done()
			t := time.NewTicker(e.tick)
			defer t.Stop()
			for {
				select {
				case <-t.C:
					if e.leader.hold(ctx) {
						e.scan(ctx)
					}
				case <-e.quit:
					e.leader.stop(context.Background())
					return
				case <-ctx.Done():
					return
				}
			}
		}()
	})
}

func (e *alertEvaluator) Stop() {
	close(e.quit)
	e.wg.Wait()
}

func (e *alertEvaluator) scan(ctx context.Context) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	rules, err := e.q.ListEnabledAlertRules(ctx)
	if err != nil {
		e.logger.Warn("alert scan: list rules", "error", err)
		return
	}
	for _, rule := range rules {
		if err := e.evaluate(ctx, rule); err != nil {
			e.logger.Warn("alert scan: evaluate", "rule", rule.Name, "error", err)
		}
	}
}

func (e *alertEvaluator) evaluate(ctx context.Context, rule db.CoreAlertRule) error {
	var cfg AlertRuleConfig
	if err := json.Unmarshal(rule.Config, &cfg); err != nil {
		return nil // bad config can't be fixed by re-scanning; skip quietly
	}
	now := time.Now()
	var breached map[string]float64 // component → measured value
	var metric, unit string

	switch rule.Kind {
	case AlertKindHeartbeatSilence:
		rows, err := e.q.LastHeartbeats(ctx, rule.ProjectID)
		if err != nil {
			return err
		}
		breached = map[string]float64{}
		for _, r := range rows {
			silent := now.Sub(r.LastBeat.Time).Minutes()
			if silent >= float64(cfg.ThresholdMinutes) {
				breached[r.ComponentName] = silent
			}
		}
		metric, unit = "silence", "minutes"

	case AlertKindErrorSpike:
		rows, err := e.q.RecentErrorCounts(ctx, db.RecentErrorCountsParams{
			ProjectID: rule.ProjectID,
			Column2:   int64(cfg.WindowMinutes) * 60,
		})
		if err != nil {
			return err
		}
		breached = map[string]float64{}
		for _, r := range rows {
			if r.Errors >= cfg.ThresholdCount {
				breached[r.ComponentName] = float64(r.Errors)
			}
		}
		metric, unit = "errors", "count"

	default:
		return nil
	}

	firing := parseFiring(rule.State)
	changed := false
	// newly breached components → fired
	for comp, value := range breached {
		if cfg.Component != "" && comp != cfg.Component {
			continue
		}
		if firing[comp] {
			continue
		}
		firing[comp] = true
		changed = true
		e.publish(ctx, rule.ProjectID, AlertEventFired, map[string]any{
			"rule_id": rule.ID.String(), "rule": rule.Name, "kind": rule.Kind,
			"component": comp, "metric": metric, "value": value, "unit": unit,
		})
	}
	// recovered components → resolved
	for comp, on := range firing {
		_, stillBreached := breached[comp]
		if !on || stillBreached {
			continue
		}
		firing[comp] = false
		changed = true
		e.publish(ctx, rule.ProjectID, AlertEventResolved, map[string]any{
			"rule_id": rule.ID.String(), "rule": rule.Name, "kind": rule.Kind,
			"component": comp,
		})
	}
	if !changed {
		return nil
	}
	raw, _ := json.Marshal(map[string]any{"firing": firing})
	return e.q.SetAlertRuleState(ctx, db.SetAlertRuleStateParams{ID: rule.ID, ProjectID: rule.ProjectID, State: raw})
}
