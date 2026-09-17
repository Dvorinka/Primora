#!/usr/bin/env bash
# End-to-end smoke test against a running Primora stack.
# Expects the compose stack on BASE_URL (nginx :80 by default).
#
#   ./scripts/smoke-e2e.sh
#   BASE_URL=http://localhost:8080 ./scripts/smoke-e2e.sh
#
# Covers: health, signup/login, bootstrap, scoped API keys, ingest,
# telemetry read, and the Prometheus endpoint. Exits non-zero on failure.

set -euo pipefail

BASE="${BASE_URL:-http://localhost}"
EMAIL="smoke-$(date +%s)@example.com"
PASSWORD="smoke-password-$(date +%s)"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }
step() { echo "==> $*"; }

wait_for() {
  local url="$1" name="$2" tries=60
  while (( tries-- > 0 )); do
    if curl -fsS -o /dev/null "$url" 2>/dev/null; then
      echo "    $name ready"
      return 0
    fi
    sleep 2
  done
  fail "$name did not become ready ($url)"
}

step "waiting for services"
wait_for "$BASE/api/v1/health/liveness" "backend liveness"
wait_for "$BASE/api/v1/health/readiness" "backend readiness"
wait_for "$BASE/auth-health" "auth"

step "signup $EMAIL"
code=$(curl -sS -o /dev/null -w '%{http_code}' -c "$JAR" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Smoke Test\"}" \
  "$BASE/auth/sign-up/email")
[ "$code" = "200" ] || [ "$code" = "201" ] || fail "sign-up returned $code"

step "fetch api token"
token=$(curl -fsS -b "$JAR" "$BASE/auth/token" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
[ -n "$token" ] || fail "no token in /auth/token response"

step "bootstrap organization + project"
code=$(curl -sS -o /tmp/smoke-bootstrap.json -w '%{http_code}' -H "authorization: Bearer $token" -H 'content-type: application/json' \
  -d '{"organizationName":"Smoke Org","organizationSlug":"smoke-org","projectName":"Smoke Project","projectSlug":"smoke-project"}' \
  "$BASE/api/v1/bootstrap")
if [ "$code" = "409" ]; then
  # Instance already bootstrapped — create a fresh org + project for this user.
  org_id=$(curl -fsS -H "authorization: Bearer $token" -H 'content-type: application/json' \
    -d "{\"name\":\"Smoke Org $(date +%s)\",\"slug\":\"smoke-$(date +%s)\"}" \
    "$BASE/api/v1/organizations" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
  [ -n "$org_id" ] || fail "could not create organization"
  project_id=$(curl -fsS -H "authorization: Bearer $token" -H 'content-type: application/json' \
    -d "{\"name\":\"Smoke Project\",\"slug\":\"smoke-$(date +%s)-p\"}" \
    "$BASE/api/v1/organizations/$org_id/projects" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
else
  [ "$code" = "200" ] || [ "$code" = "201" ] || { cat /tmp/smoke-bootstrap.json >&2; fail "bootstrap returned $code"; }
  project_id=$(sed -n 's/.*"project_id":"\([^"]*\)".*/\1/p' /tmp/smoke-bootstrap.json)
fi
[ -n "$project_id" ] || fail "no project_id available"
echo "    project $project_id"

step "create ingest+read API key"
key_json=$(curl -fsS -H "authorization: Bearer $token" -H 'content-type: application/json' \
  -d '{"name":"smoke-ingest","scopes":["ingest","read"]}' \
  "$BASE/api/v1/projects/$project_id/api-keys")
api_key=$(echo "$key_json" | sed -n 's/.*"secret":"\([^"]*\)".*/\1/p')
[ -n "$api_key" ] || fail "no secret in api key response"
echo "$key_json" | grep -q '"ingest"' || fail "scopes missing from api key response"

step "ingest event via X-Primora-Key"
curl -fsS -o /dev/null -H "X-Primora-Key: $api_key" -H 'content-type: application/json' \
  -d '{"events":[{"type":"metric","severity":"info","component":"smoke","message":"smoke metric","payload":{"name":"smoke.count","value":1}}]}' \
  "$BASE/api/v1/ingest"

step "negative: read-only key cannot ingest"
ro_json=$(curl -fsS -H "authorization: Bearer $token" -H 'content-type: application/json' \
  -d '{"name":"smoke-readonly","scopes":["read"]}' \
  "$BASE/api/v1/projects/$project_id/api-keys")
ro_key=$(echo "$ro_json" | sed -n 's/.*"secret":"\([^"]*\)".*/\1/p')
code=$(curl -sS -o /dev/null -w '%{http_code}' -H "X-Primora-Key: $ro_key" -H 'content-type: application/json' \
  -d '{"type":"metric","severity":"info","message":"should be rejected"}' \
  "$BASE/api/v1/ingest")
[ "$code" = "403" ] || fail "read-only key ingest returned $code, expected 403"

step "read back events"
curl -fsS -o /dev/null -H "authorization: Bearer $token" \
  "$BASE/api/v1/projects/$project_id/events?limit=5"

step "prometheus metrics"
curl -fsS "$BASE/api/v1/metrics" | grep -q 'primora_http_requests_total' \
  || fail "metrics endpoint missing primora_http_requests_total"

echo
echo "smoke: all checks passed"
