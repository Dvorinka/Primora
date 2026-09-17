package services

import (
	"context"
	"log/slog"
	"time"

	"github.com/tdvorak/primora/apps/backend/internal/repositories"
)

// RetentionSweeper deletes telemetry events, audit rows, and webhook
// deliveries that are past each project's retention window. It runs once
// shortly after boot and then hourly — a missed sweep is not a problem, the
// next tick catches it.
type RetentionSweeper struct {
	repo     *repositories.CoreRepository
	logger   *slog.Logger
	interval time.Duration
}

func NewRetentionSweeper(repo *repositories.CoreRepository, logger *slog.Logger) *RetentionSweeper {
	return &RetentionSweeper{repo: repo, logger: logger, interval: time.Hour}
}

func (s *RetentionSweeper) Run(ctx context.Context) {
	// jarvis: initial delay — let migrations and first-party seeds settle before sweeping.
	timer := time.NewTimer(time.Minute)
	defer timer.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-timer.C:
			s.Sweep(ctx)
			timer.Reset(s.interval)
		}
	}
}

func (s *RetentionSweeper) Sweep(ctx context.Context) {
	q := s.repo.Queries()
	for _, sweep := range []struct {
		name string
		fn   func(context.Context) (int64, error)
	}{
		{"events", q.SweepExpiredEvents},
		{"audit_logs", q.SweepExpiredAuditLogs},
		{"audit_logs_org", q.SweepExpiredOrgAuditLogs},
		{"webhook_deliveries", q.SweepExpiredWebhookDeliveries},
	} {
		rows, err := sweep.fn(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			s.logger.Warn("retention sweep failed", "stream", sweep.name, "error", err)
			continue
		}
		if rows > 0 {
			s.logger.Info("retention sweep removed rows", "stream", sweep.name, "rows", rows)
		}
	}
}
