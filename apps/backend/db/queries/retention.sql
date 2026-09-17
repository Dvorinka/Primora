-- Per-project retention sweeps. A retention of 0 days disables the sweep for
-- that stream. Pending webhook deliveries are never swept — they may still be
-- retrying.

-- name: SweepExpiredEvents :execrows
DELETE FROM core.events e
USING core.projects p
WHERE e.project_id = p.id
  AND p.retention_events_days > 0
  AND e.ts < NOW() - make_interval(days => p.retention_events_days);

-- name: SweepExpiredAuditLogs :execrows
DELETE FROM core.audit_logs a
USING core.projects p
WHERE a.project_id = p.id
  AND p.retention_audit_days > 0
  AND a.created_at < NOW() - make_interval(days => p.retention_audit_days);

-- name: SweepExpiredOrgAuditLogs :execrows
-- Org-scoped audit rows (project_id NULL) have no project retention — sweep
-- them on a fixed 365-day floor so they cannot grow unbounded.
DELETE FROM core.audit_logs a
WHERE a.project_id IS NULL
  AND a.created_at < NOW() - INTERVAL '365 days';

-- name: SweepExpiredWebhookDeliveries :execrows
DELETE FROM core.webhook_deliveries d
USING core.webhooks w
JOIN core.projects p ON p.id = w.project_id
WHERE d.webhook_id = w.id
  AND p.retention_webhook_days > 0
  AND d.status <> 'pending'
  AND d.created_at < NOW() - make_interval(days => p.retention_webhook_days);
