package services

import (
	"context"
	"encoding/json"
	"log/slog"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/tdvorak/primora/apps/backend/internal/database/db"
)

type stubAlertQueries struct {
	rules      []db.CoreAlertRule
	beats      []db.LastHeartbeatsRow
	errors     []db.RecentErrorCountsRow
	stateSaved map[uuid.UUID][]byte
}

func (s *stubAlertQueries) ListEnabledAlertRules(ctx context.Context) ([]db.CoreAlertRule, error) {
	return s.rules, nil
}
func (s *stubAlertQueries) LastHeartbeats(ctx context.Context, projectID uuid.UUID) ([]db.LastHeartbeatsRow, error) {
	return s.beats, nil
}
func (s *stubAlertQueries) RecentErrorCounts(ctx context.Context, arg db.RecentErrorCountsParams) ([]db.RecentErrorCountsRow, error) {
	return s.errors, nil
}
func (s *stubAlertQueries) SetAlertRuleState(ctx context.Context, arg db.SetAlertRuleStateParams) error {
	if s.stateSaved == nil {
		s.stateSaved = map[uuid.UUID][]byte{}
	}
	s.stateSaved[arg.ID] = arg.State
	// persist back so subsequent evaluations see the transition
	for i, r := range s.rules {
		if r.ID == arg.ID {
			s.rules[i].State = arg.State
		}
	}
	return nil
}

func rule(t *testing.T, kind string, cfg AlertRuleConfig) db.CoreAlertRule {
	raw, err := json.Marshal(cfg)
	if err != nil {
		t.Fatal(err)
	}
	return db.CoreAlertRule{ID: uuid.New(), ProjectID: uuid.New(), Name: "r1", Kind: kind, Config: raw, State: []byte(`{"firing":{}}`)}
}

func collect() (func(ctx context.Context, projectID uuid.UUID, eventType string, data map[string]any), *[]string) {
	events := &[]string{}
	return func(ctx context.Context, projectID uuid.UUID, eventType string, data map[string]any) {
		*events = append(*events, eventType+":"+data["component"].(string))
	}, events
}

func TestAlertSilenceFiresOnceThenResolves(t *testing.T) {
	r := rule(t, AlertKindHeartbeatSilence, AlertRuleConfig{ThresholdMinutes: 5})
	stub := &stubAlertQueries{
		rules: []db.CoreAlertRule{r},
		beats: []db.LastHeartbeatsRow{{
			ComponentName: "web",
			LastBeat:      pgtype.Timestamptz{Time: time.Now().Add(-10 * time.Minute), Valid: true},
		}},
	}
	publish, events := collect()
	e := &alertEvaluator{q: stub, publish: publish, logger: slog.Default()}

	if err := e.evaluate(context.Background(), stub.rules[0]); err != nil {
		t.Fatal(err)
	}
	if len(*events) != 1 || (*events)[0] != "alert.fired:web" {
		t.Fatalf("want one alert.fired:web, got %v", *events)
	}

	// second evaluation — still silent, must not refire
	if err := e.evaluate(context.Background(), stub.rules[0]); err != nil {
		t.Fatal(err)
	}
	if len(*events) != 1 {
		t.Fatalf("refired: %v", *events)
	}

	// heartbeat resumes → resolved
	stub.beats[0].LastBeat = pgtype.Timestamptz{Time: time.Now(), Valid: true}
	if err := e.evaluate(context.Background(), stub.rules[0]); err != nil {
		t.Fatal(err)
	}
	if len(*events) != 2 || (*events)[1] != "alert.resolved:web" {
		t.Fatalf("want alert.resolved:web, got %v", *events)
	}
}

func TestAlertErrorSpikeThreshold(t *testing.T) {
	r := rule(t, AlertKindErrorSpike, AlertRuleConfig{ThresholdCount: 3, WindowMinutes: 15})
	stub := &stubAlertQueries{
		rules:  []db.CoreAlertRule{r},
		errors: []db.RecentErrorCountsRow{{ComponentName: "api", Errors: 2}},
	}
	publish, events := collect()
	e := &alertEvaluator{q: stub, publish: publish, logger: slog.Default()}

	if err := e.evaluate(context.Background(), stub.rules[0]); err != nil {
		t.Fatal(err)
	}
	if len(*events) != 0 {
		t.Fatalf("under threshold fired: %v", *events)
	}

	stub.errors[0].Errors = 5
	if err := e.evaluate(context.Background(), stub.rules[0]); err != nil {
		t.Fatal(err)
	}
	if len(*events) != 1 || (*events)[0] != "alert.fired:api" {
		t.Fatalf("want alert.fired:api, got %v", *events)
	}
}

func TestAlertComponentFilter(t *testing.T) {
	r := rule(t, AlertKindHeartbeatSilence, AlertRuleConfig{Component: "web", ThresholdMinutes: 5})
	stub := &stubAlertQueries{
		rules: []db.CoreAlertRule{r},
		beats: []db.LastHeartbeatsRow{
			{ComponentName: "web", LastBeat: pgtype.Timestamptz{Time: time.Now().Add(-time.Hour), Valid: true}},
			{ComponentName: "api", LastBeat: pgtype.Timestamptz{Time: time.Now().Add(-time.Hour), Valid: true}},
		},
	}
	publish, events := collect()
	e := &alertEvaluator{q: stub, publish: publish, logger: slog.Default()}

	if err := e.evaluate(context.Background(), stub.rules[0]); err != nil {
		t.Fatal(err)
	}
	if len(*events) != 1 || (*events)[0] != "alert.fired:web" {
		t.Fatalf("filtered rule must fire only for web, got %v", *events)
	}
}

func TestValidateAlertRule(t *testing.T) {
	s := &PlatformService{}
	if _, err := s.validateAlertRule(UpsertAlertRuleInput{Name: "ok", Kind: AlertKindHeartbeatSilence, Config: AlertRuleConfig{ThresholdMinutes: 5}}); err != nil {
		t.Fatalf("valid silence rule rejected: %v", err)
	}
	cfg, err := s.validateAlertRule(UpsertAlertRuleInput{Name: "ok", Kind: AlertKindErrorSpike, Config: AlertRuleConfig{ThresholdCount: 3}})
	if err != nil || cfg.WindowMinutes != 15 {
		t.Fatalf("window default: cfg=%+v err=%v", cfg, err)
	}
	for _, bad := range []UpsertAlertRuleInput{
		{Name: "bad name!", Kind: AlertKindHeartbeatSilence, Config: AlertRuleConfig{ThresholdMinutes: 5}},
		{Name: "x", Kind: "bogus", Config: AlertRuleConfig{}},
		{Name: "x", Kind: AlertKindHeartbeatSilence, Config: AlertRuleConfig{ThresholdMinutes: 0}},
		{Name: "x", Kind: AlertKindErrorSpike, Config: AlertRuleConfig{ThresholdCount: 0}},
	} {
		if _, err := s.validateAlertRule(bad); err == nil {
			t.Fatalf("accepted invalid rule %+v", bad)
		}
	}
}
