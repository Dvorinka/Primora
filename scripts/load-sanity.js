// Primora load sanity — NOT a benchmark. Verifies the ingest path and a hot
// read endpoint hold up under modest concurrency without errors.
//
//   k6 run scripts/load-sanity.js \
//     -e PRIMORA_API_KEY=prm_xxx_xxx \
//     -e PRIMORA_PROJECT_ID=<uuid> \
//     -e BASE_URL=http://localhost
//
// The key needs the ingest + read scopes. Create one in Settings → API keys.

import http from "k6/http";
import { check } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost";
const API_KEY = __ENV.PRIMORA_API_KEY || "";
const PROJECT = __ENV.PRIMORA_PROJECT_ID || "";

export const options = {
  scenarios: {
    ingest: {
      exec: "ingest",
      executor: "constant-vus",
      vus: 5,
      duration: "30s",
    },
    hot_read: {
      exec: "hotRead",
      executor: "constant-vus",
      vus: 10,
      duration: "30s",
    },
  },
  // 429s are the rate limiter doing its job (API_KEY_RATE_LIMIT_PER_MINUTE,
  // default 600/min) — counted as expected via responseCallback below. The
  // sanity bar is: no real errors, no hangs. Raise the env limit or lower
  // VUs to exercise unthrottled throughput.
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

const ingestBody = JSON.stringify({
  events: [
    {
      type: "metric",
      severity: "info",
      component: "load-sanity",
      message: "k6 sanity metric",
      payload: { name: "k6.sanity", value: 1 },
    },
  ],
});

export function ingest() {
  const res = http.post(`${BASE}/api/v1/ingest`, ingestBody, {
    headers: {
      "content-type": "application/json",
      "X-Primora-Key": API_KEY,
    },
    responseCallback: http.expectedStatuses(202, 429),
  });
  check(res, { "ingest 202 or throttled": (r) => r.status === 202 || r.status === 429 });
}

export function hotRead() {
  const res = http.get(
    `${BASE}/api/v1/projects/${PROJECT}/events?limit=25`,
    {
      headers: { "X-Primora-Key": API_KEY },
      responseCallback: http.expectedStatuses(200, 429),
    },
  );
  check(res, { "events 200 or throttled": (r) => r.status === 200 || r.status === 429 });
}
