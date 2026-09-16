package services

import (
	"context"
	"crypto/sha256"
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

var telemetryEventTypes = map[string]bool{
	"error": true, "metric": true, "log": true, "heartbeat": true, "event": true,
}

var componentKinds = map[string]bool{
	"frontend": true, "backend": true, "database": true,
	"android": true, "desktop": true, "web": true, "other": true,
}

// IngestEventInput is one event in an ingest batch.
type IngestEventInput struct {
	Type        string          `json:"type"`
	Component   string          `json:"component"`
	Kind        string          `json:"kind"`
	Severity    string          `json:"severity"`
	Message     string          `json:"message"`
	Payload     json.RawMessage `json:"payload"`
	Fingerprint string          `json:"fingerprint"`
	TS          *time.Time      `json:"ts"`
}

// TelemetryEvent is the client-facing event shape.
type TelemetryEvent struct {
	ID            int64           `json:"id"`
	ProjectID     uuid.UUID       `json:"project_id"`
	ComponentID   *uuid.UUID      `json:"component_id"`
	ComponentName string          `json:"component_name,omitempty"`
	Type          string          `json:"type"`
	Severity      string          `json:"severity"`
	Message       string          `json:"message"`
	Payload       json.RawMessage `json:"payload"`
	Fingerprint   string          `json:"fingerprint"`
	TS            time.Time       `json:"ts"`
}

type TelemetryIssue struct {
	Fingerprint   string     `json:"fingerprint"`
	Message       string     `json:"message"`
	ComponentID   *uuid.UUID `json:"component_id"`
	ComponentName string     `json:"component_name,omitempty"`
	Count         int64      `json:"count"`
	FirstSeen     time.Time  `json:"first_seen"`
	LastSeen      time.Time  `json:"last_seen"`
	Severity      string     `json:"severity"`
}

type ComponentSummary struct {
	ID         uuid.UUID      `json:"id"`
	Name       string         `json:"name"`
	Kind       string         `json:"kind"`
	LastSeenAt *time.Time     `json:"last_seen_at"`
	LastStatus string         `json:"last_status"`
	Errors24h  int64          `json:"errors_24h"`
	Events24h  int64          `json:"events_24h"`
	Meta       map[string]any `json:"meta"`
}

func fingerprintOf(componentID uuid.UUID, message string) string {
	line := strings.SplitN(message, "\n", 2)[0]
	sum := sha256.Sum256([]byte(componentID.String() + "|" + line))
	return hex.EncodeToString(sum[:])[:16]
}

// IngestEvents stores a batch of telemetry events under the ingest key's
// project. API-key actors only — the key's project scope is the write scope.
func (s *PlatformService) IngestEvents(ctx context.Context, actor *models.Actor, events []IngestEventInput) (int, error) {
	if actor == nil || actor.ProjectID == nil || actor.APIKeyID == nil {
		return 0, errors.New("ingest requires a project API key")
	}
	projectID := *actor.ProjectID

	var inserted []TelemetryEvent
	var newIssues []TelemetryEvent
	err := s.repo.WithTx(ctx, func(q *db.Queries) error {
		compCache := map[string]*uuid.UUID{}
		for _, ev := range events {
			if !telemetryEventTypes[ev.Type] {
				continue
			}
			var compID *uuid.UUID
			if ev.Component != "" {
				cached, hit := compCache[ev.Component]
				if !hit {
					kind := ev.Kind
					if !componentKinds[kind] {
						kind = "other"
					}
					row, err := q.UpsertComponent(ctx, db.UpsertComponentParams{
						ProjectID: projectID,
						Name:      ev.Component,
						Kind:      kind,
					})
					if err != nil {
						continue
					}
					id := row.ID
					cached = &id
					compCache[ev.Component] = cached
				}
				compID = cached
			}
			sev := ev.Severity
			if sev == "" {
				sev = "info"
				if ev.Type == "error" {
					sev = "error"
				}
			}
			fp := ev.Fingerprint
			if ev.Type == "error" && fp == "" && compID != nil {
				fp = fingerprintOf(*compID, ev.Message)
			}
			ts := time.Now()
			if ev.TS != nil {
				ts = *ev.TS
			}
			payload := ev.Payload
			if len(payload) == 0 {
				payload = json.RawMessage(`{}`)
			}
			newFingerprint := false
			if ev.Type == "error" && fp != "" {
				seen, err := q.HasFingerprintSeen(ctx, db.HasFingerprintSeenParams{
					ProjectID:   projectID,
					Fingerprint: fp,
				})
				if err == nil && !seen {
					newFingerprint = true
				}
			}
			var cid pgtype.UUID
			if compID != nil {
				cid = pgtype.UUID{Bytes: *compID, Valid: true}
			}
			row, err := q.InsertEvent(ctx, db.InsertEventParams{
				ProjectID:   projectID,
				ComponentID: cid,
				Type:        ev.Type,
				Severity:    sev,
				Message:     ev.Message,
				Payload:     payload,
				Fingerprint: fp,
				Ts:          pgtype.Timestamptz{Time: ts, Valid: true},
			})
			if err != nil {
				continue
			}
			out := TelemetryEvent{
				ID:          row.ID,
				ProjectID:   row.ProjectID,
				Type:        row.Type,
				Severity:    row.Severity,
				Message:     row.Message,
				Payload:     row.Payload,
				Fingerprint: row.Fingerprint,
				TS:          row.Ts.Time,
			}
			if compID != nil {
				out.ComponentID = compID
				out.ComponentName = ev.Component
			}
			inserted = append(inserted, out)
			if newFingerprint {
				newIssues = append(newIssues, out)
			}
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	_ = s.repo.Queries().TouchAPIKey(ctx, *actor.APIKeyID)
	for _, ev := range inserted {
		s.hub.Broadcast(ev.ProjectID.String(), ev)
	}
	// A fresh error fingerprint is a new issue group — notify webhooks.
	for _, issue := range newIssues {
		s.dispatchEvent(ctx, projectID, WebhookEventIssueCreated, map[string]any{
			"fingerprint":    issue.Fingerprint,
			"message":        issue.Message,
			"severity":       issue.Severity,
			"component_id":   issue.ComponentID,
			"component_name": issue.ComponentName,
			"event_id":       issue.ID,
			"first_seen":     issue.TS,
		})
	}
	return len(inserted), nil
}

// SubscribeTelemetry validates read access and returns an event channel.
func (s *PlatformService) SubscribeTelemetry(ctx context.Context, actor *models.Actor, projectID uuid.UUID) (chan []byte, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer", "viewer"); err != nil {
		return nil, err
	}
	return s.hub.Subscribe(projectID.String()), nil
}

func (s *PlatformService) UnsubscribeTelemetry(projectID uuid.UUID, ch chan []byte) {
	s.hub.Unsubscribe(projectID.String(), ch)
}

type EventListFilters struct {
	Type        string
	Component   string
	Fingerprint string
	Before      *int64
	Limit       int
}

func (s *PlatformService) ListEvents(ctx context.Context, actor *models.Actor, projectID uuid.UUID, f EventListFilters) ([]TelemetryEvent, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer", "viewer"); err != nil {
		return nil, err
	}
	if f.Limit <= 0 || f.Limit > 500 {
		f.Limit = 100
	}
	rows, err := s.repo.Queries().ListEvents(ctx, db.ListEventsParams{
		ProjectID:   projectID,
		Type:        strPtr(f.Type),
		Component:   strPtr(f.Component),
		Fingerprint: strPtr(f.Fingerprint),
		Before:      f.Before,
		Limit:       int32(f.Limit),
	})
	if err != nil {
		return nil, err
	}
	out := make([]TelemetryEvent, 0, len(rows))
	for _, r := range rows {
		out = append(out, toTelemetryEvent(r))
	}
	return out, nil
}

func (s *PlatformService) ListIssues(ctx context.Context, actor *models.Actor, projectID uuid.UUID, days int) ([]TelemetryIssue, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer", "viewer"); err != nil {
		return nil, err
	}
	if days <= 0 || days > 365 {
		days = 30
	}
	rows, err := s.repo.Queries().ListErrorGroups(ctx, db.ListErrorGroupsParams{
		ProjectID: projectID,
		Days:      strPtr(fmt.Sprint(days)),
	})
	if err != nil {
		return nil, err
	}
	out := make([]TelemetryIssue, 0, len(rows))
	for _, r := range rows {
		issue := TelemetryIssue{
			Fingerprint: r.Fingerprint,
			Message:     r.Message,
			Count:       r.Count,
			Severity:    r.Severity,
		}
		if r.FirstSeen.Valid {
			issue.FirstSeen = r.FirstSeen.Time
		}
		if r.LastSeen.Valid {
			issue.LastSeen = r.LastSeen.Time
		}
		if id, err := uuid.Parse(r.ComponentID); err == nil {
			issue.ComponentID = &id
		}
		issue.ComponentName = r.ComponentName
		out = append(out, issue)
	}
	return out, nil
}

func windowSeconds(w string) int64 {
	switch w {
	case "1h":
		return 3600
	case "7d":
		return 7 * 86400
	case "30d":
		return 30 * 86400
	default:
		return 86400
	}
}

func bucketSeconds(window int64) int64 {
	switch {
	case window <= 3600:
		return 60
	case window <= 86400:
		return 900
	case window <= 7*86400:
		return 3600
	default:
		return 86400
	}
}

type EventSeriesBucket struct {
	TS     time.Time        `json:"ts"`
	Counts map[string]int64 `json:"counts"`
}

type MetricPoint struct {
	TS    time.Time `json:"ts"`
	Avg   *float64  `json:"avg"`
	P50   *float64  `json:"p50"`
	P95   *float64  `json:"p95"`
	Max   *float64  `json:"max"`
	Count int64     `json:"count"`
}

type TelemetryStatsResult struct {
	Window      int64               `json:"window"`
	BucketSec   int64               `json:"bucket_sec"`
	Series      []EventSeriesBucket `json:"series"`
	Components  []ComponentSummary  `json:"components"`
	Errors      int64               `json:"errors"`
	Events      int64               `json:"events"`
	Metrics     int64               `json:"metrics"`
	MetricNames []string            `json:"metric_names"`
}

func (s *PlatformService) TelemetryStats(ctx context.Context, actor *models.Actor, projectID uuid.UUID, window string) (*TelemetryStatsResult, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer", "viewer"); err != nil {
		return nil, err
	}
	win := windowSeconds(window)
	bucket := bucketSeconds(win)

	seriesRows, err := s.repo.Queries().EventTypeSeries(ctx, db.EventTypeSeriesParams{
		ProjectID: projectID,
		BucketSec: bucket,
		WindowSec: win,
	})
	if err != nil {
		return nil, err
	}
	series := make([]EventSeriesBucket, 0, len(seriesRows))
	for _, r := range seriesRows {
		n := len(series)
		if n == 0 || !series[n-1].TS.Equal(r.Bucket.Time) {
			series = append(series, EventSeriesBucket{TS: r.Bucket.Time, Counts: map[string]int64{}})
			n++
		}
		series[n-1].Counts[r.Type] = r.Count
	}

	compRows, err := s.repo.Queries().ComponentHealthRows(ctx, projectID)
	if err != nil {
		return nil, err
	}
	components := make([]ComponentSummary, 0, len(compRows))
	for _, r := range compRows {
		c := ComponentSummary{ID: r.ID, Name: r.Name, Kind: r.Kind, Errors24h: r.Errors24h, Events24h: r.Events24h}
		if r.LastSeenAt.Valid {
			t := r.LastSeenAt.Time
			c.LastSeenAt = &t
		}
		c.LastStatus = r.LastStatus
		if len(r.Meta) > 0 {
			_ = json.Unmarshal(r.Meta, &c.Meta)
		}
		components = append(components, c)
	}

	totals, err := s.repo.Queries().EventTotals(ctx, db.EventTotalsParams{ProjectID: projectID, WindowSec: win})
	if err != nil {
		return nil, err
	}
	names, err := s.repo.Queries().MetricNames(ctx, projectID)
	if err != nil {
		return nil, err
	}
	if names == nil {
		names = []string{}
	}
	return &TelemetryStatsResult{
		Window:      win,
		BucketSec:   bucket,
		Series:      series,
		Components:  components,
		Errors:      totals.Errors,
		Events:      totals.Events,
		Metrics:     totals.Metrics,
		MetricNames: names,
	}, nil
}

func (s *PlatformService) MetricSeriesData(ctx context.Context, actor *models.Actor, projectID uuid.UUID, name, window string) ([]MetricPoint, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer", "viewer"); err != nil {
		return nil, err
	}
	if name == "" {
		return nil, errors.New("name required")
	}
	win := windowSeconds(window)
	rows, err := s.repo.Queries().MetricSeries(ctx, db.MetricSeriesParams{
		ProjectID: projectID,
		Name:      name,
		BucketSec: bucketSeconds(win),
		WindowSec: win,
	})
	if err != nil {
		return nil, err
	}
	out := make([]MetricPoint, 0, len(rows))
	for _, r := range rows {
		out = append(out, MetricPoint{TS: r.Bucket.Time, Avg: &r.Avg, P50: &r.P50, P95: &r.P95, Max: &r.Max, Count: r.Count})
	}
	return out, nil
}

func (s *PlatformService) ListComponents(ctx context.Context, actor *models.Actor, projectID uuid.UUID) ([]ComponentSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer", "viewer"); err != nil {
		return nil, err
	}
	rows, err := s.repo.Queries().ListComponents(ctx, projectID)
	if err != nil {
		return nil, err
	}
	out := make([]ComponentSummary, 0, len(rows))
	for _, r := range rows {
		c := ComponentSummary{ID: r.ID, Name: r.Name, Kind: r.Kind}
		if len(r.Meta) > 0 {
			_ = json.Unmarshal(r.Meta, &c.Meta)
		}
		out = append(out, c)
	}
	return out, nil
}

func (s *PlatformService) DeleteComponent(ctx context.Context, actor *models.Actor, projectID, componentID uuid.UUID) error {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return err
	}
	return s.repo.Queries().DeleteComponent(ctx, db.DeleteComponentParams{ID: componentID, ProjectID: projectID})
}

func toTelemetryEvent(r db.ListEventsRow) TelemetryEvent {
	ev := TelemetryEvent{
		ID:          r.ID,
		ProjectID:   r.ProjectID,
		Type:        r.Type,
		Severity:    r.Severity,
		Message:     r.Message,
		Payload:     r.Payload,
		Fingerprint: r.Fingerprint,
		TS:          r.Ts.Time,
	}
	if r.ComponentID.Valid {
		id := uuid.UUID(r.ComponentID.Bytes)
		ev.ComponentID = &id
	}
	if r.ComponentName != nil {
		ev.ComponentName = *r.ComponentName
	}
	return ev
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
