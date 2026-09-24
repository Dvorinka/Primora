package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/tdvorak/primora/apps/backend/internal/database/db"
	"github.com/tdvorak/primora/apps/backend/internal/models"
)

var functionNamePattern = regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9_-]{0,63}$`)

// FunctionRunner executes a function's code with a JSON payload on stdin
// and returns the outcome. Implemented by execRunner (a runtime binary on
// the backend host); tests substitute a fake.
type FunctionRunner interface {
	Run(ctx context.Context, runtime, code string, payload json.RawMessage) FunctionResult
}

// FunctionResult is one execution's captured outcome.
type FunctionResult struct {
	Status     string // success | error | timeout
	ExitCode   *int32
	Stdout     string
	Stderr     string
	DurationMs int64
}

// execRunner shells out to a JS runtime binary. User code runs with the
// backend's privileges — this is the documented self-hosted model (same as
// n8n custom-code nodes); operators harden at the container/VM boundary.
// jarvis: ceiling unsandboxed exec; upgrade to Firecracker/gVisor or a
// sidecar runtime pool when multi-tenant isolation is needed.
type execRunner struct {
	bin        string
	timeout    time.Duration
	maxOutput  int64
	resolveBin func(runtime string) string
}

func NewExecRunner(bin string, timeout time.Duration, maxOutput int64) *execRunner {
	return &execRunner{
		bin:       bin,
		timeout:   timeout,
		maxOutput: maxOutput,
		resolveBin: func(runtime string) string {
			if bin != "" && bin != "auto" {
				return bin
			}
			return runtime // "bun" or "deno" from PATH
		},
	}
}

func (r *execRunner) Run(ctx context.Context, runtime, code string, payload json.RawMessage) FunctionResult {
	bin := r.resolveBin(runtime)
	if bin == "" {
		return FunctionResult{Status: "error", Stderr: "no functions runtime configured"}
	}

	dir, err := os.MkdirTemp("", "primora-fn-*")
	if err != nil {
		return FunctionResult{Status: "error", Stderr: err.Error()}
	}
	defer os.RemoveAll(dir)
	file := filepath.Join(dir, "fn.ts")
	if err := os.WriteFile(file, []byte(code), 0o600); err != nil {
		return FunctionResult{Status: "error", Stderr: err.Error()}
	}

	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	var cmd *exec.Cmd
	switch runtime {
	case "deno":
		// --no-prompt: never block on interactive permission prompts.
		cmd = exec.CommandContext(ctx, bin, "run", "--no-prompt", file)
	default: // bun
		cmd = exec.CommandContext(ctx, bin, "run", file)
	}
	cmd.Stdin = bytes.NewReader(payload)
	cmd.Env = append(os.Environ(),
		"PRIMORA_PAYLOAD="+string(payload),
		"PRIMORA_FUNCTION_RUNTIME="+runtime,
	)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &limitedWriter{w: &stdout, max: r.maxOutput}
	cmd.Stderr = &limitedWriter{w: &stderr, max: r.maxOutput}

	start := time.Now()
	runErr := cmd.Run()
	duration := time.Since(start).Milliseconds()

	res := FunctionResult{
		Status:     "success",
		Stdout:     stdout.String(),
		Stderr:     stderr.String(),
		DurationMs: duration,
	}
	if ctx.Err() == context.DeadlineExceeded {
		res.Status = "timeout"
		res.Stderr = strings.TrimSpace(res.Stderr + "\nexecution timed out")
		return res
	}
	if runErr != nil {
		res.Status = "error"
		if exitErr, ok := runErr.(*exec.ExitError); ok {
			code := int32(exitErr.ExitCode())
			res.ExitCode = &code
		} else {
			res.Stderr = strings.TrimSpace(runErr.Error() + "\n" + res.Stderr)
		}
	}
	return res
}

// limitedWriter caps captured output; excess bytes are discarded, not
// stored — a chatty function can't grow function_runs rows unboundedly.
type limitedWriter struct {
	w   *bytes.Buffer
	max int64
}

func (l *limitedWriter) Write(p []byte) (int, error) {
	remaining := l.max - int64(l.w.Len())
	if remaining > 0 {
		if int64(len(p)) > remaining {
			l.w.Write(p[:remaining])
		} else {
			l.w.Write(p)
		}
	}
	return len(p), nil
}

// --- service layer -------------------------------------------------------

type CreateFunctionInput struct {
	Name         string `json:"name" validate:"required"`
	Code         string `json:"code" validate:"required,max=262144"`
	Runtime      string `json:"runtime" validate:"omitempty,oneof=bun deno"`
	EventPattern string `json:"event_pattern" validate:"omitempty,max=128"`
}

type UpdateFunctionInput struct {
	Code         *string `json:"code" validate:"omitempty,max=262144"`
	Enabled      *bool   `json:"enabled"`
	EventPattern *string `json:"event_pattern" validate:"omitempty,max=128"`
}

type FunctionSummary struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Runtime      string    `json:"runtime"`
	Enabled      bool      `json:"enabled"`
	EventPattern string    `json:"event_pattern,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type FunctionRunSummary struct {
	ID         string    `json:"id"`
	Trigger    string    `json:"trigger"`
	Status     string    `json:"status"`
	ExitCode   *int32    `json:"exit_code,omitempty"`
	Stdout     string    `json:"stdout"`
	Stderr     string    `json:"stderr"`
	DurationMs int64     `json:"duration_ms"`
	CreatedAt  time.Time `json:"created_at"`
}

func functionSummary(r db.CoreFunction) FunctionSummary {
	return FunctionSummary{
		ID:           r.ID.String(),
		Name:         r.Name,
		Runtime:      r.Runtime,
		Enabled:      r.Enabled,
		EventPattern: r.EventPattern,
		CreatedAt:    r.CreatedAt.Time,
		UpdatedAt:    r.UpdatedAt.Time,
	}
}

func runSummary(r db.CoreFunctionRun) FunctionRunSummary {
	return FunctionRunSummary{
		ID:         r.ID.String(),
		Trigger:    r.Trigger,
		Status:     r.Status,
		ExitCode:   r.ExitCode,
		Stdout:     r.Stdout,
		Stderr:     r.Stderr,
		DurationMs: int64(r.DurationMs),
		CreatedAt:  r.CreatedAt.Time,
	}
}

func (s *PlatformService) CreateFunction(ctx context.Context, actor *models.Actor, projectID uuid.UUID, input CreateFunctionInput, requestID string) (FunctionSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer"); err != nil {
		return FunctionSummary{}, err
	}
	name := strings.TrimSpace(input.Name)
	if !functionNamePattern.MatchString(name) {
		return FunctionSummary{}, fmt.Errorf("invalid function name")
	}
	runtime := input.Runtime
	if runtime == "" {
		runtime = "bun"
	}
	row, err := s.repo.Queries().CreateFunction(ctx, db.CreateFunctionParams{
		ProjectID:    projectID,
		Name:         name,
		Code:         input.Code,
		Runtime:      runtime,
		EventPattern: strings.TrimSpace(input.EventPattern),
	})
	if err != nil {
		return FunctionSummary{}, err
	}
	if project, err := s.repo.Queries().GetProjectByID(ctx, projectID); err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, projectID, actor, requestID, "function.created", "function", row.ID.String(), map[string]any{
			"name": row.Name, "runtime": row.Runtime,
		}))
	}
	return functionSummary(row), nil
}

func (s *PlatformService) ListFunctions(ctx context.Context, actor *models.Actor, projectID uuid.UUID) ([]FunctionSummary, error) {
	if err := s.requireProjectRole(ctx, actor, projectID, "admin", "developer", "viewer"); err != nil {
		return nil, err
	}
	rows, err := s.repo.Queries().ListFunctions(ctx, projectID)
	if err != nil {
		return nil, err
	}
	out := make([]FunctionSummary, len(rows))
	for i, r := range rows {
		out[i] = functionSummary(r)
	}
	return out, nil
}

// GetFunctionCode returns the function's source — code is not a secret,
// project members already see it in the dashboard editor.
func (s *PlatformService) GetFunctionCode(ctx context.Context, actor *models.Actor, functionID uuid.UUID) (FunctionSummary, string, error) {
	row, err := s.repo.Queries().GetFunction(ctx, functionID)
	if err != nil {
		return FunctionSummary{}, "", err
	}
	if err := s.requireProjectRole(ctx, actor, row.ProjectID, "admin", "developer", "viewer"); err != nil {
		return FunctionSummary{}, "", err
	}
	return functionSummary(row), row.Code, nil
}

func (s *PlatformService) UpdateFunction(ctx context.Context, actor *models.Actor, functionID uuid.UUID, input UpdateFunctionInput, requestID string) (FunctionSummary, error) {
	row, err := s.repo.Queries().GetFunction(ctx, functionID)
	if err != nil {
		return FunctionSummary{}, err
	}
	if err := s.requireProjectRole(ctx, actor, row.ProjectID, "admin", "developer"); err != nil {
		return FunctionSummary{}, err
	}
	var pattern *string
	if input.EventPattern != nil {
		p := strings.TrimSpace(*input.EventPattern)
		pattern = &p
	}
	updated, err := s.repo.Queries().UpdateFunction(ctx, db.UpdateFunctionParams{
		ID:           functionID,
		ProjectID:    row.ProjectID,
		Code:         input.Code,
		Enabled:      input.Enabled,
		EventPattern: pattern,
	})
	if err != nil {
		return FunctionSummary{}, err
	}
	if project, err := s.repo.Queries().GetProjectByID(ctx, row.ProjectID); err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, row.ProjectID, actor, requestID, "function.updated", "function", functionID.String(), map[string]any{
			"name": updated.Name,
		}))
	}
	return functionSummary(updated), nil
}

func (s *PlatformService) DeleteFunction(ctx context.Context, actor *models.Actor, functionID uuid.UUID, requestID string) error {
	row, err := s.repo.Queries().GetFunction(ctx, functionID)
	if err != nil {
		return err
	}
	if err := s.requireProjectRole(ctx, actor, row.ProjectID, "admin", "developer"); err != nil {
		return err
	}
	if err := s.repo.Queries().DeleteFunction(ctx, db.DeleteFunctionParams{
		ID:        functionID,
		ProjectID: row.ProjectID,
	}); err != nil {
		return err
	}
	if project, err := s.repo.Queries().GetProjectByID(ctx, row.ProjectID); err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, row.ProjectID, actor, requestID, "function.deleted", "function", functionID.String(), map[string]any{
			"name": row.Name,
		}))
	}
	return nil
}

// InvokeFunction executes a function with a JSON payload, records the run,
// and returns its summary.
func (s *PlatformService) InvokeFunction(ctx context.Context, actor *models.Actor, functionID uuid.UUID, payload json.RawMessage, requestID string) (FunctionRunSummary, error) {
	row, err := s.repo.Queries().GetFunction(ctx, functionID)
	if err != nil {
		return FunctionRunSummary{}, err
	}
	if err := s.requireProjectRole(ctx, actor, row.ProjectID, "admin", "developer"); err != nil {
		return FunctionRunSummary{}, err
	}
	summary, err := s.executeFunction(ctx, row, payload, "manual")
	if err != nil {
		return FunctionRunSummary{}, err
	}
	if project, err := s.repo.Queries().GetProjectByID(ctx, row.ProjectID); err == nil {
		_, _ = s.repo.Queries().CreateAuditLog(ctx, newAuditParams(project.OrganizationID, row.ProjectID, actor, requestID, "function.invoked", "function", functionID.String(), map[string]any{
			"name": row.Name, "status": summary.Status,
		}))
	}
	return summary, nil
}

// executeFunction runs a function row and records the outcome — shared by
// manual invoke, schedule/hook delivery, and event triggers (no role check;
// callers hold their own auth context or are system paths).
func (s *PlatformService) executeFunction(ctx context.Context, row db.CoreFunction, payload json.RawMessage, trigger string) (FunctionRunSummary, error) {
	if !row.Enabled {
		return FunctionRunSummary{}, fmt.Errorf("function is disabled")
	}
	if len(payload) == 0 {
		payload = json.RawMessage(`{}`)
	}
	if !json.Valid(payload) {
		return FunctionRunSummary{}, fmt.Errorf("payload must be valid JSON")
	}
	if s.functions == nil {
		return FunctionRunSummary{}, fmt.Errorf("functions runtime not configured")
	}
	result := s.functions.Run(ctx, row.Runtime, row.Code, payload)
	var exit *int32
	if result.ExitCode != nil {
		exit = result.ExitCode
	}
	run, err := s.repo.Queries().InsertFunctionRun(ctx, db.InsertFunctionRunParams{
		FunctionID: row.ID,
		Trigger:    trigger,
		Status:     result.Status,
		ExitCode:   exit,
		Stdout:     result.Stdout,
		Stderr:     result.Stderr,
		DurationMs: int32(result.DurationMs),
	})
	if err != nil {
		return FunctionRunSummary{}, err
	}
	return runSummary(run), nil
}

// runJobFunction is the scheduler's delivery path for function-targeted
// jobs: load the function, run it with the resolved payload, record the
// run. The job run's status_code mirrors the process exit code.
func (s *PlatformService) runJobFunction(ctx context.Context, job db.CoreScheduledJob, run db.CoreScheduledJobRun, payload json.RawMessage) (*int32, error) {
	fn, err := s.repo.Queries().GetFunction(ctx, uuid.UUID(job.FunctionID.Bytes))
	if err != nil {
		return nil, fmt.Errorf("target function missing: %w", err)
	}
	summary, err := s.executeFunction(ctx, fn, payload, triggerFromJobRun(run.TriggeredBy))
	if err != nil {
		return nil, err
	}
	code := int32(0)
	if summary.ExitCode != nil {
		code = *summary.ExitCode
	}
	if summary.Status != "success" {
		return &code, fmt.Errorf("function %q %s: %s", fn.Name, summary.Status, truncate(summary.Stderr, 200))
	}
	return &code, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}

func triggerFromJobRun(triggeredBy string) string {
	switch triggeredBy {
	case "schedule", "hook", "manual":
		return triggeredBy
	default:
		return "schedule"
	}
}

// triggerFunctionsForEvent fans a domain event out to every enabled
// function whose event_pattern matches ("document.*", "*", …). Runs are
// detached — event publishers never block on user code.
// jarvis: ceiling pattern is a single * suffix/prefix wildcard via SQL
// LIKE; upgrade to a real matcher if multi-segment globs are needed.
func (s *PlatformService) triggerFunctionsForEvent(ctx context.Context, projectID uuid.UUID, eventType string, data map[string]any) {
	if s.functions == nil {
		return
	}
	rows, err := s.repo.Queries().ListFunctionsForEvent(ctx, db.ListFunctionsForEventParams{
		ProjectID:    projectID,
		EventPattern: eventType,
	})
	if err != nil || len(rows) == 0 {
		return
	}
	payload, _ := json.Marshal(map[string]any{
		"event":       eventType,
		"project_id":  projectID.String(),
		"occurred_at": time.Now().UTC().Format(time.RFC3339),
		"data":        data,
	})
	for _, fn := range rows {
		fn := fn
		go func() {
			// Detached context: the publishing request may finish first.
			runCtx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
			defer cancel()
			if _, err := s.executeFunction(runCtx, fn, payload, "event"); err != nil {
				s.logger.Warn("function event trigger failed", "function", fn.Name, "event", eventType, "error", err)
			}
		}()
	}
}

func (s *PlatformService) ListFunctionRuns(ctx context.Context, actor *models.Actor, functionID uuid.UUID, limit int64) ([]FunctionRunSummary, error) {
	row, err := s.repo.Queries().GetFunction(ctx, functionID)
	if err != nil {
		return nil, err
	}
	if err := s.requireProjectRole(ctx, actor, row.ProjectID, "admin", "developer", "viewer"); err != nil {
		return nil, err
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := s.repo.Queries().ListFunctionRuns(ctx, db.ListFunctionRunsParams{
		FunctionID: row.ID,
		Limit:      int32(limit),
	})
	if err != nil {
		return nil, err
	}
	out := make([]FunctionRunSummary, len(rows))
	for i, r := range rows {
		out[i] = runSummary(r)
	}
	return out, nil
}
