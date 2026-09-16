-- name: ListWebhooks :many
SELECT * FROM core.webhooks
WHERE project_id = $1
ORDER BY created_at ASC;

-- name: GetWebhookByID :one
SELECT * FROM core.webhooks
WHERE id = $1;

-- name: ListWebhooksForEvent :many
SELECT * FROM core.webhooks
WHERE project_id = $1
  AND enabled
  AND (cardinality(events) = 0 OR $2::text = ANY(events));

-- name: CreateWebhook :one
INSERT INTO core.webhooks (
  project_id,
  url,
  secret,
  events,
  enabled,
  created_by_user_id
) VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: UpdateWebhook :one
UPDATE core.webhooks
SET url = $3,
    events = $4,
    enabled = $5,
    secret = CASE WHEN $6::boolean THEN $7 ELSE secret END,
    updated_at = NOW()
WHERE id = $1
  AND project_id = $2
RETURNING *;

-- name: DeleteWebhook :one
DELETE FROM core.webhooks
WHERE id = $1
  AND project_id = $2
RETURNING *;

-- name: InsertWebhookDelivery :one
INSERT INTO core.webhook_deliveries (
  webhook_id,
  event_type,
  payload,
  next_retry_at
) VALUES ($1, $2, $3, NOW())
RETURNING *;

-- name: GetWebhookDeliveryByID :one
SELECT * FROM core.webhook_deliveries
WHERE id = $1;

-- name: ListWebhookDeliveries :many
SELECT * FROM core.webhook_deliveries
WHERE webhook_id = $1
ORDER BY created_at DESC
LIMIT $2;

-- name: ListPendingWebhookDeliveries :many
SELECT * FROM core.webhook_deliveries
WHERE status = 'pending'
  AND (next_retry_at IS NULL OR next_retry_at <= NOW())
ORDER BY created_at
LIMIT $1;

-- name: MarkWebhookDelivery :exec
UPDATE core.webhook_deliveries
SET status = $2,
    attempts = attempts + 1,
    last_status_code = $3,
    last_error = $4,
    delivered_at = $5,
    next_retry_at = $6
WHERE id = $1;
