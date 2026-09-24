package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/robfig/cron/v3"

	db "github.com/tdvorak/primora/apps/backend/internal/database/db"
	"github.com/tdvorak/primora/apps/backend/internal/models"
	"github.com/tdvorak/primora/apps/backend/internal/secrets"
)

// WebhookEventJobRun fires on every scheduled-job execution, successful or not.
const WebhookEventJobRun = "job.run"

// maxJobRunsPerJob bounds run history — older rows are pruned on each finish.
const maxJobRunsPerJob = 200

type ScheduledJobSummary struct {
	ID         uuid.UUID       `json:"id"`
	ProjectID  uuid.UUID       `json:"project_id"`
	Name       string          `json:"name"`
	Schedule   string          `json:"schedule"`
	URL        string          `json:"url"`
	FunctionID *string         `json:"function_id,omitempty"`
	Payload    json.RawMessage `json:"payload"`
	Enabled    bool            `json:"enabled"`
	HasSecret  bool            `json:"has_secret"`
	LastRunAt  *time.Time      `json:"last_run_at"`
	LastStatus *string         `json:"last_status"`
	NextRunAt  *time.Time      `json:"next_run_at"`
	CreatedAt  time.Time       `json:"created_at"`
	// Secret is populated only when Primora generated it — one chance to see it.
	Secret string `json:"secret,omitempty"`
}

type ScheduledJobRunSummary struct {
	ID          uuid.UUID  `json:"id"`
	JobID       uuid.UUID  `json:"job_id"`
	Status      string     `json:"status"`
	TriggeredBy string     `json:"triggered_by"`
	StatusCode  *int32     `json:"status_code"`
	Error       string     `json:"error"`
	DurationMs  *int32     `json:"duration_ms"`
	StartedAt   time.Time  `json:"started_at"`
	FinishedAt  *time.Time `json:"finished_at"`
}

type CreateScheduledJobInput struct {
	Name       string         `json:"name" validate:"required,min=2"`
	Schedule   string         `json:"schedule" validate:"required"`
	URL        string         `json:"url" validate:"required_without=FunctionID,omitempty,url"`
	FunctionID string         `json:"function_id" validate:"omitempty,uuid"`
	Secret     string         `json:"secret"`
	Payload    map[string]any `json:"payload"`
	Enabled    *bool          `json:"enabled"`
}

type UpdateScheduledJobInput struct {
	Name       *string        `json:"name" validate:"omitempty,min=2"`
	Schedule   *string        `json:"schedule"`
	URL        *string        `json:"url" validate:"omitempty,url"`
	FunctionID *string        `json:"function_id" validate:"omitempty,uuid"`
	Secret     *string        `json:"secret"`
	Payload    map[string]any `json:"payload"`
	Enabled    *bool          `json:"enabled"`
}

func toJobSummary(row db.CoreScheduledJob) ScheduledJobSummary {
	out := ScheduledJobSummary{
		ID:         row.ID,
		ProjectID:  row.ProjectID,
		Name:       row.Name,
		Schedule:   row.Schedule,
		URL:        row.Url,
		Payload:    row.Payload,
		Enabled:    row.Enabled,
		HasSecret:  len(row.Secret) > 0,
		CreatedAt:  row.CreatedAt.Time,
	}
	if row.FunctionID.Valid {
		id := uuid.UUID(row.FunctionID.Bytes).String()
		out.FunctionID = &id
	}
	if row.LastRunAt.Valid {
		t := row.LastRunAt.Time
		out.LastRunAt = &t
	}
	if row.LastStatus != "" {
		s := row.LastStatus
		out.LastStatus = &s
	}
	if row.NextRunAt.Valid {
		t := row.NextRunAt.Time
		out.NextRunAt = &t
	}
	return out
}

func toJobRunSummary(row db.CoreScheduledJobRun) ScheduledJobRunSummary {
	out := ScheduledJobRunSummary{
		ID:          row.ID,
		JobID:       row.JobID,
		Status:      row.Status,
		TriggeredBy: row.TriggeredBy,
		StatusCode:  row.StatusCode,
		Error:       row.Error,
		DurationMs:  row.DurationMs,
		StartedAt:   row.CreatedAt.Time,
	}
	if row.FinishedAt.Valid {
		t := row.FinishedAt.Time
		out.FinishedAt = &t
	}
	return out
}

// parseSchedule accepts standard 5-field cron expressions plus robfig
// descriptors (@hourly, @every 30m, …).
func parseSchedule(expr string) (cron.Schedule, error) {
	expr = strings.TrimSpace(expr)
	if expr == "" {
		return nil, errors.New("schedule is required")
	}
	sched, err := cron.ParseStandard(expr)
	if err != nil {
		return nil, fmt.Errorf("invalid schedule %q — expected a cron expression like \"*/15 * * * *\" or \"@every 1h\"", expr)
	}
	return sched, nil
}

func nextRunAt(sched cron.Schedule, from time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: sched.Next(from), Valid: true}
}

func (s *PlatformService) jobFor(ctx context.Context, actor *models.Actor, projectID, jobID uuid.UUID, write bool) (db.CoreScheduledJob, error) {
	roles := []string{"admin", "developer", "viewer"}
	if write {
		roles = []string{"admin", "developer"}
	}
	if err := s.requireProjectRole(ctx, actor, projectID, roles...); err != nil {
		return db.CoreScheduledJob{}, err
	}
	row, err := s.repo.Queries().GetScheduledJobByID(ctx, jobID)
	if err != nil {
		return db.CoreScheduledJob{}, err
	}
	if row.ProjectID != projectID {
		return db.CoreScheduledJob{}, fmt.Errorf("job access denied")
	}
	return row, nil
}

func (s *PlatformService) ListScheduledJobs(ctx context.Context, actor *models.Actor, projectID uuid.UUID) ([]ScheduledJobSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer", "viewer"); err != nil {
		return nil, err
	}
	rows, err := s.repo.Queries().ListScheduledJobs(ctx, projectID)
	if err != nil {
		return nil, err
	}
	out := make([]ScheduledJobSummary, 0, len(rows))
	for _, row := range rows {
		out = append(out, toJobSummary(row))
	}
	return out, nil
}

func (s *PlatformService) CreateScheduledJob(ctx context.Context, actor *models.Actor, projectID uuid.UUID, input CreateScheduledJobInput, requestID string) (ScheduledJobSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return ScheduledJobSummary{}, err
	}
	jobURL := ""
	var functionID pgtype.UUID
	if input.FunctionID != "" {
		fid, err := uuid.Parse(input.FunctionID)
		if err != nil {
			return ScheduledJobSummary{}, fmt.Errorf("invalid function_id")
		}
		fn, err := s.repo.Queries().GetFunction(ctx, fid)
		if err != nil || fn.ProjectID != projectID {
			return ScheduledJobSummary{}, fmt.Errorf("function not found in this project")
		}
		functionID = pgtype.UUID{Bytes: fid, Valid: true}
		jobURL = "function://" + fid.String()
	} else {
		var err error
		jobURL, err = normalizeWebhookURL(input.URL)
		if err != nil {
			return ScheduledJobSummary{}, err
		}
	}
	sched, err := parseSchedule(input.Schedule)
	if err != nil {
		return ScheduledJobSummary{}, err
	}
	secret := strings.TrimSpace(input.Secret)
	generated := false
	if secret == "" {
		if secret, err = randomToken(16); err != nil {
			return ScheduledJobSummary{}, err
		}
		generated = true
	}
	secretBytes, err := s.enc.Encrypt([]byte(secret))
	if err != nil {
		return ScheduledJobSummary{}, err
	}
	payload := []byte("{}")
	if input.Payload != nil {
		payload, _ = json.Marshal(input.Payload)
	}
	enabled := true
	if input.Enabled != nil {
		enabled = *input.Enabled
	}
	var createdBy pgtype.UUID
	if actor.UserID != nil {
		createdBy = pgtype.UUID{Bytes: *actor.UserID, Valid: true}
	}
	var next pgtype.Timestamptz
	if enabled {
		next = nextRunAt(sched, time.Now())
	}
	row, err := s.repo.Queries().CreateScheduledJob(ctx, db.CreateScheduledJobParams{
		ProjectID:       projectID,
		Name:            strings.TrimSpace(input.Name),
		Schedule:        strings.TrimSpace(input.Schedule),
		Url:             jobURL,
		Secret:          secretBytes,
		Payload:         payload,
		Enabled:         enabled,
		NextRunAt:       next,
		CreatedByUserID: createdBy,
		FunctionID:      functionID,
	})
	if err != nil {
		if strings.Contains(err.Error(), "scheduled_jobs_project_id_name_key") {
			return ScheduledJobSummary{}, fmt.Errorf("a job named %q already exists", input.Name)
		}
		return ScheduledJobSummary{}, err
	}
	if project, err := s.repo.Queries().GetProjectByID(ctx, projectID); err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "job.created", "scheduled_job", row.ID.String(), map[string]any{
			"name": row.Name, "schedule": row.Schedule, "url": row.Url,
		}))
	}
	summary := toJobSummary(row)
	if generated {
		summary.Secret = secret
	}
	return summary, nil
}

func (s *PlatformService) UpdateScheduledJob(ctx context.Context, actor *models.Actor, projectID, jobID uuid.UUID, input UpdateScheduledJobInput, requestID string) (ScheduledJobSummary, error) {
	row, err := s.jobFor(ctx, actor, projectID, jobID, true)
	if err != nil {
		return ScheduledJobSummary{}, err
	}
	name := row.Name
	if input.Name != nil {
		name = strings.TrimSpace(*input.Name)
	}
	schedule := row.Schedule
	if input.Schedule != nil {
		schedule = strings.TrimSpace(*input.Schedule)
	}
	jobURL := row.Url
	if input.URL != nil {
		if jobURL, err = normalizeWebhookURL(*input.URL); err != nil {
			return ScheduledJobSummary{}, err
		}
	}
	rotateFunction := input.FunctionID != nil
	functionID := row.FunctionID
	if rotateFunction {
		raw := strings.TrimSpace(*input.FunctionID)
		if raw == "" {
			functionID = pgtype.UUID{} // explicit clear → back to URL delivery
			if input.URL == nil && strings.HasPrefix(jobURL, "function://") {
				return ScheduledJobSummary{}, fmt.Errorf("clearing function_id requires a url")
			}
		} else {
			fid, ferr := uuid.Parse(raw)
			if ferr != nil {
				return ScheduledJobSummary{}, fmt.Errorf("invalid function_id")
			}
			fn, ferr := s.repo.Queries().GetFunction(ctx, fid)
			if ferr != nil || fn.ProjectID != projectID {
				return ScheduledJobSummary{}, fmt.Errorf("function not found in this project")
			}
			functionID = pgtype.UUID{Bytes: fid, Valid: true}
			jobURL = "function://" + fid.String()
		}
	}
	enabled := row.Enabled
	if input.Enabled != nil {
		enabled = *input.Enabled
	}
	sched, err := parseSchedule(schedule)
	if err != nil {
		return ScheduledJobSummary{}, err
	}
	var next pgtype.Timestamptz
	if enabled {
		next = nextRunAt(sched, time.Now())
	}
	rotateSecret := input.Secret != nil
	var secretBytes []byte
	if rotateSecret {
		secret := strings.TrimSpace(*input.Secret)
		if secret == "" {
			if secret, err = randomToken(16); err != nil {
				return ScheduledJobSummary{}, err
			}
		}
		if secretBytes, err = s.enc.Encrypt([]byte(secret)); err != nil {
			return ScheduledJobSummary{}, err
		}
	}
	rotatePayload := input.Payload != nil
	var payload []byte
	if rotatePayload {
		payload, _ = json.Marshal(input.Payload)
	}
	updated, err := s.repo.Queries().UpdateScheduledJob(ctx, db.UpdateScheduledJobParams{
		ID:        jobID,
		ProjectID: projectID,
		Name:      name,
		Schedule:  schedule,
		Url:       jobURL,
		Enabled:   enabled,
		NextRunAt: next,
		Column8:   rotateSecret,
		Secret:    secretBytes,
		Column10:  rotatePayload,
		Payload:   payload,
		Column12:  rotateFunction,
		FunctionID: functionID,
	})
	if err != nil {
		if strings.Contains(err.Error(), "scheduled_jobs_project_id_name_key") {
			return ScheduledJobSummary{}, fmt.Errorf("a job named %q already exists", name)
		}
		return ScheduledJobSummary{}, err
	}
	project, _ := s.repo.Queries().GetProjectByID(ctx, projectID)
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "job.updated", "scheduled_job", jobID.String(), map[string]any{
		"name": updated.Name, "schedule": updated.Schedule, "url": updated.Url, "enabled": updated.Enabled,
	}))
	summary := toJobSummary(updated)
	if rotateSecret && strings.TrimSpace(*input.Secret) == "" {
		if plain, decErr := s.enc.Decrypt(updated.Secret); decErr == nil {
			summary.Secret = string(plain)
		}
	}
	return summary, nil
}

func (s *PlatformService) DeleteScheduledJob(ctx context.Context, actor *models.Actor, projectID, jobID uuid.UUID, requestID string) error {
	row, err := s.jobFor(ctx, actor, projectID, jobID, true)
	if err != nil {
		return err
	}
	if _, err := s.repo.Queries().DeleteScheduledJob(ctx, db.DeleteScheduledJobParams{
		ID:        jobID,
		ProjectID: projectID,
	}); err != nil {
		return err
	}
	project, _ := s.repo.Queries().GetProjectByID(ctx, projectID)
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "job.deleted", "scheduled_job", jobID.String(), map[string]any{
		"name": row.Name,
	}))
	return nil
}

func (s *PlatformService) ListScheduledJobRuns(ctx context.Context, actor *models.Actor, projectID, jobID uuid.UUID, limit int32) ([]ScheduledJobRunSummary, error) {
	if _, err := s.jobFor(ctx, actor, projectID, jobID, false); err != nil {
		return nil, err
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := s.repo.Queries().ListScheduledJobRuns(ctx, db.ListScheduledJobRunsParams{
		JobID: jobID,
		Limit: limit,
	})
	if err != nil {
		return nil, err
	}
	out := make([]ScheduledJobRunSummary, 0, len(rows))
	for _, row := range rows {
		out = append(out, toJobRunSummary(row))
	}
	return out, nil
}

// RunScheduledJob queues an out-of-band manual run. The run row is returned
// in "running" state; the result lands asynchronously.
func (s *PlatformService) RunScheduledJob(ctx context.Context, actor *models.Actor, projectID, jobID uuid.UUID, requestID string) (ScheduledJobRunSummary, error) {
	job, err := s.jobFor(ctx, actor, projectID, jobID, true)
	if err != nil {
		return ScheduledJobRunSummary{}, err
	}
	if s.scheduler == nil {
		return ScheduledJobRunSummary{}, errors.New("scheduler unavailable")
	}
	run, err := s.scheduler.enqueue(ctx, job, "manual")
	if err != nil {
		return ScheduledJobRunSummary{}, err
	}
	project, _ := s.repo.Queries().GetProjectByID(ctx, projectID)
	_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "job.run", "scheduled_job", jobID.String(), map[string]any{
		"name": job.Name, "run_id": run.ID.String(),
	}))
	return toJobRunSummary(run), nil
}

// ---------------------------------------------------------------------------
// JobScheduler — in-process ticker, signed POST per due job, run history.
// ---------------------------------------------------------------------------

// jobQueries is the slice of db.Queries the scheduler needs — narrow so tests
// can stub it.
type jobQueries interface {
	ListDueScheduledJobs(ctx context.Context, now pgtype.Timestamptz) ([]db.CoreScheduledJob, error)
	InsertScheduledJobRun(ctx context.Context, params db.InsertScheduledJobRunParams) (db.CoreScheduledJobRun, error)
	FinishScheduledJobRun(ctx context.Context, params db.FinishScheduledJobRunParams) (db.CoreScheduledJobRun, error)
	MarkScheduledJobRan(ctx context.Context, params db.MarkScheduledJobRanParams) (db.CoreScheduledJob, error)
	PruneScheduledJobRuns(ctx context.Context, params db.PruneScheduledJobRunsParams) error
	ListProjectSecretValues(ctx context.Context, projectID uuid.UUID) ([]db.ListProjectSecretValuesRow, error)
}

type JobScheduler struct {
	repo     jobQueries
	enc      *secrets.Encryptor
	logger   *slog.Logger
	http     *http.Client
	interval time.Duration
	queue    chan jobExec
	quit     chan struct{}
	wg       sync.WaitGroup
	started  sync.Once
	leader   *leaderState
	// onEvent fans a finished run out to webhooks and the realtime stream.
	onEvent func(ctx context.Context, projectID uuid.UUID, eventType string, data map[string]any)
	// runFn delivers to a function instead of HTTP when job.FunctionID is set.
	// The function receives the resolved job payload, not the run envelope.
	// Owned by PlatformService — the scheduler stays transport-agnostic.
	runFn func(ctx context.Context, job db.CoreScheduledJob, run db.CoreScheduledJobRun, payload json.RawMessage) (*int32, error)
}

type jobExec struct {
	job db.CoreScheduledJob
	run db.CoreScheduledJobRun
}

func NewJobScheduler(q jobQueries, enc *secrets.Encryptor, logger *slog.Logger, onEvent func(ctx context.Context, projectID uuid.UUID, eventType string, data map[string]any), pool *pgxpool.Pool) *JobScheduler {
	if logger == nil {
		logger = slog.Default()
	}
	return &JobScheduler{
		repo:     q,
		enc:      enc,
		logger:   logger,
		http:     &http.Client{Timeout: 10 * time.Second},
		interval: 15 * time.Second,
		queue:    make(chan jobExec, 256),
		quit:     make(chan struct{}),
		onEvent:  onEvent,
		leader:   newLeaderState(pool, leaderKeyScheduler),
	}
}

func (j *JobScheduler) Start(ctx context.Context) {
	j.started.Do(func() {
		j.wg.Add(1)
		go j.run(ctx)
	})
}

func (j *JobScheduler) Stop() {
	close(j.quit)
	j.wg.Wait()
}

func (j *JobScheduler) run(ctx context.Context) {
	defer j.wg.Done()
	ticker := time.NewTicker(j.interval)
	defer ticker.Stop()
	for {
		select {
		case exec := <-j.queue:
			j.execute(exec.job, exec.run)
		case <-ticker.C:
			// Only the leader fires scheduled runs — manual/hook enqueues are
			// already scoped to whichever replica received the request.
			if j.leader.hold(ctx) {
				j.scan()
			}
		case <-j.quit:
			j.leader.stop(context.Background())
			return
		case <-ctx.Done():
			return
		}
	}
}

// scan picks up enabled jobs whose next_run_at has passed. Missed occurrences
// collapse into a single run — Primora fires once, not once per missed tick.
func (j *JobScheduler) scan() {
	ctx := context.Background()
	jobs, err := j.repo.ListDueScheduledJobs(ctx, pgtype.Timestamptz{Time: time.Now(), Valid: true})
	if err != nil {
		j.logger.Warn("scheduled job scan failed", "error", err)
		return
	}
	for _, job := range jobs {
		run, err := j.repo.InsertScheduledJobRun(ctx, db.InsertScheduledJobRunParams{JobID: job.ID, TriggeredBy: "schedule"})
		if err != nil {
			j.logger.Warn("job run insert failed", "job_id", job.ID, "error", err)
			j.markRan(ctx, job, "failed")
			continue
		}
		j.execute(job, run)
	}
}

// enqueue inserts the run row synchronously so callers get a run ID, then
// hands the execution to the worker.
func (j *JobScheduler) enqueue(ctx context.Context, job db.CoreScheduledJob, triggeredBy string) (db.CoreScheduledJobRun, error) {
	run, err := j.repo.InsertScheduledJobRun(ctx, db.InsertScheduledJobRunParams{
		JobID:       job.ID,
		TriggeredBy: triggeredBy,
	})
	if err != nil {
		return db.CoreScheduledJobRun{}, err
	}
	select {
	case j.queue <- jobExec{job: job, run: run}:
	case <-j.quit:
	default:
		j.logger.Warn("job queue full, run dropped", "job_id", job.ID, "run_id", run.ID)
	}
	return run, nil
}

func (j *JobScheduler) execute(job db.CoreScheduledJob, run db.CoreScheduledJobRun) {
	ctx := context.Background()
	start := time.Now()
	statusCode, sendErr := j.deliver(ctx, job, run)
	status := "success"
	errText := ""
	if sendErr != nil {
		status = "failed"
		errText = sendErr.Error()
	}
	duration := int32(time.Since(start).Milliseconds())
	_, _ = j.repo.FinishScheduledJobRun(ctx, db.FinishScheduledJobRunParams{
		ID:         run.ID,
		Status:     status,
		StatusCode: statusCode,
		Error:      errText,
		DurationMs: &duration,
	})
	j.markRan(ctx, job, status)
	_ = j.repo.PruneScheduledJobRuns(ctx, db.PruneScheduledJobRunsParams{JobID: job.ID, Limit: maxJobRunsPerJob})
	if j.onEvent != nil {
		j.onEvent(ctx, job.ProjectID, WebhookEventJobRun, map[string]any{
			"job_id":       job.ID.String(),
			"job_name":     job.Name,
			"run_id":       run.ID.String(),
			"triggered_by": run.TriggeredBy,
			"status":       status,
			"status_code":  statusCode,
			"error":        errText,
			"duration_ms":  duration,
		})
	}
}

func (j *JobScheduler) markRan(ctx context.Context, job db.CoreScheduledJob, status string) {
	var next pgtype.Timestamptz
	if job.Enabled {
		if sched, err := parseSchedule(job.Schedule); err == nil {
			next = nextRunAt(sched, time.Now())
		}
	}
	if _, err := j.repo.MarkScheduledJobRan(ctx, db.MarkScheduledJobRanParams{
		ID:         job.ID,
		LastRunAt:  pgtype.Timestamptz{Time: time.Now(), Valid: true},
		LastStatus: status,
		NextRunAt:  next,
	}); err != nil {
		j.logger.Warn("job mark-ran failed", "job_id", job.ID, "error", err)
	}
}

// deliver POSTs the job payload to its URL — or invokes the target function
// when the job carries a function_id.
func (j *JobScheduler) deliver(ctx context.Context, job db.CoreScheduledJob, run db.CoreScheduledJobRun) (*int32, error) {
	data, err := resolveSecretRefs(ctx, j.repo.ListProjectSecretValues, j.enc, job.ProjectID, job.Payload)
	if err != nil {
		return nil, err
	}
	payload, _ := json.Marshal(map[string]any{
		"event":        WebhookEventJobRun,
		"project_id":   job.ProjectID.String(),
		"job_id":       job.ID.String(),
		"job_name":     job.Name,
		"run_id":       run.ID.String(),
		"triggered_by": run.TriggeredBy,
		"occurred_at":  time.Now().UTC().Format(time.RFC3339),
		"data":         data,
	})
	if job.FunctionID.Valid {
		if j.runFn == nil {
			return nil, fmt.Errorf("functions runtime not configured")
		}
		return j.runFn(ctx, job, run, data)
	}
	secret := ""
	if len(job.Secret) > 0 && j.enc != nil {
		if plain, err := j.enc.Decrypt(job.Secret); err == nil {
			secret = string(plain)
		}
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, job.Url, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Primora-Event", WebhookEventJobRun)
	req.Header.Set("X-Primora-Job", job.ID.String())
	req.Header.Set("X-Primora-Run", run.ID.String())
	req.Header.Set("X-Primora-Signature", "sha256="+signBody(secret, payload))
	resp, err := j.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1<<16))
	code := int32(resp.StatusCode)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return &code, fmt.Errorf("endpoint returned %d", resp.StatusCode)
	}
	return &code, nil
}
