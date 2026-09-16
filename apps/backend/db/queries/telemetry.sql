-- name: UpsertComponent :one
INSERT INTO core.components (project_id, name, kind)
VALUES ($1, $2, $3)
ON CONFLICT (project_id, name) DO UPDATE SET name = EXCLUDED.name
RETURNING *;

-- name: GetComponentByName :one
SELECT * FROM core.components
WHERE project_id = $1 AND name = $2;

-- name: ListComponents :many
SELECT * FROM core.components
WHERE project_id = $1
ORDER BY name;

-- name: DeleteComponent :exec
DELETE FROM core.components
WHERE id = $1 AND project_id = $2;

-- name: HasFingerprintSeen :one
SELECT EXISTS(
  SELECT 1 FROM core.events
  WHERE project_id = $1 AND fingerprint = $2 AND type = 'error'
) AS seen;

-- name: InsertEvent :one
INSERT INTO core.events (project_id, component_id, type, severity, message, payload, fingerprint, ts)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: ListEvents :many
SELECT e.*, co.name AS component_name
FROM core.events e
LEFT JOIN core.components co ON co.id = e.component_id
WHERE e.project_id = $1
  AND (sqlc.narg('type')::text IS NULL OR e.type = sqlc.narg('type'))
  AND (sqlc.narg('component')::text IS NULL OR co.name = sqlc.narg('component'))
  AND (sqlc.narg('fingerprint')::text IS NULL OR e.fingerprint = sqlc.narg('fingerprint'))
  AND (sqlc.narg('before')::bigint IS NULL OR e.id < sqlc.narg('before'))
ORDER BY e.id DESC
LIMIT sqlc.arg('limit');

-- name: ListErrorGroups :many
SELECT e.fingerprint,
       (array_agg(e.message ORDER BY e.ts DESC))[1]::text AS message,
       coalesce((array_agg(e.component_id::text ORDER BY e.ts DESC))[1], '')::text AS component_id,
       coalesce((array_agg(co.name ORDER BY e.ts DESC))[1], '')::text AS component_name,
       count(*) AS count,
       min(e.ts)::timestamptz AS first_seen,
       max(e.ts)::timestamptz AS last_seen,
       (array_agg(e.severity ORDER BY e.ts DESC))[1]::text AS severity
FROM core.events e
LEFT JOIN core.components co ON co.id = e.component_id
WHERE e.project_id = $1 AND e.type = 'error' AND e.fingerprint <> ''
  AND e.ts > now() - (sqlc.narg('days')::text || ' days')::interval
GROUP BY e.fingerprint
ORDER BY max(e.ts) DESC
LIMIT 200;

-- name: EventTypeSeries :many
SELECT to_timestamp(floor(extract(epoch FROM e.ts) / sqlc.arg('bucket_sec')::bigint) * sqlc.arg('bucket_sec')::bigint)::timestamptz AS bucket,
       e.type,
       count(*) AS count
FROM core.events e
WHERE e.project_id = $1 AND e.ts > now() - make_interval(secs => sqlc.arg('window_sec')::bigint)
GROUP BY bucket, e.type
ORDER BY bucket;

-- name: ComponentHealthRows :many
SELECT co.id, co.name, co.kind, co.meta,
       max(e.ts)::timestamptz AS last_seen_at,
       coalesce(((array_agg(e.payload->>'status' ORDER BY e.ts DESC)
        FILTER (WHERE e.type = 'heartbeat'))[1]), '')::text AS last_status,
       count(*) FILTER (WHERE e.type = 'error' AND e.ts > now() - interval '24 hours') AS errors_24h,
       count(*) FILTER (WHERE e.ts > now() - interval '24 hours') AS events_24h
FROM core.components co
LEFT JOIN core.events e ON e.component_id = co.id
WHERE co.project_id = $1
GROUP BY co.id
ORDER BY co.name;

-- name: EventTotals :one
SELECT count(*) FILTER (WHERE type = 'error') AS errors,
       count(*) AS events,
       count(*) FILTER (WHERE type = 'metric') AS metrics
FROM core.events
WHERE project_id = $1 AND ts > now() - make_interval(secs => sqlc.arg('window_sec')::bigint);

-- name: MetricNames :many
SELECT DISTINCT (payload->>'name')::text AS name
FROM core.events
WHERE project_id = $1 AND type = 'metric' AND payload ? 'name'
ORDER BY 1
LIMIT 50;

-- name: MetricSeries :many
SELECT to_timestamp(floor(extract(epoch FROM ts) / sqlc.arg('bucket_sec')::bigint) * sqlc.arg('bucket_sec')::bigint)::timestamptz AS bucket,
       avg((payload->>'value')::float8)::float8 AS avg,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY (payload->>'value')::float8)::float8 AS p50,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY (payload->>'value')::float8)::float8 AS p95,
       max((payload->>'value')::float8)::float8 AS max,
       count(*) AS count
FROM core.events
WHERE project_id = $1 AND type = 'metric' AND payload->>'name' = sqlc.arg('name')::text
  AND ts > now() - make_interval(secs => sqlc.arg('window_sec')::bigint)
  AND jsonb_typeof(payload->'value') = 'number'
GROUP BY bucket
ORDER BY bucket;
