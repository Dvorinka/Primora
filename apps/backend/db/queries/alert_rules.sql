-- name: CreateAlertRule :one
INSERT INTO core.alert_rules (project_id, name, kind, config)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListAlertRules :many
SELECT * FROM core.alert_rules
WHERE project_id = $1
ORDER BY name;

-- name: ListEnabledAlertRules :many
SELECT * FROM core.alert_rules
WHERE enabled;

-- name: GetAlertRule :one
SELECT * FROM core.alert_rules
WHERE id = $1 AND project_id = $2;

-- name: UpdateAlertRule :one
UPDATE core.alert_rules
SET name = $3, config = $4, enabled = $5, updated_at = NOW()
WHERE id = $1 AND project_id = $2
RETURNING *;

-- name: SetAlertRuleState :exec
UPDATE core.alert_rules
SET state = $3, updated_at = NOW()
WHERE id = $1 AND project_id = $2;

-- name: DeleteAlertRule :exec
DELETE FROM core.alert_rules
WHERE id = $1 AND project_id = $2;

-- Per-component most recent heartbeat — heartbeat_silence detection.
-- name: LastHeartbeats :many
SELECT co.name AS component_name, max(e.ts)::timestamptz AS last_beat
FROM core.components co
JOIN core.events e ON e.component_id = co.id AND e.type = 'heartbeat'
WHERE co.project_id = $1
GROUP BY co.name;

-- Per-component error count inside a sliding window — error_spike detection.
-- name: RecentErrorCounts :many
SELECT co.name AS component_name, count(*) AS errors
FROM core.events e
JOIN core.components co ON co.id = e.component_id
WHERE e.project_id = $1 AND e.type = 'error'
  AND e.ts > now() - make_interval(secs => $2::bigint)
GROUP BY co.name;
