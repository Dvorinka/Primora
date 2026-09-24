import { OpenAPI } from "@primora/api-client";

import { fetchApiToken } from "./auth-client";

OpenAPI.BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
// encodeURI leaves ?#& intact in path params — smuggles query segments.
OpenAPI.ENCODE_PATH = encodeURIComponent;
OpenAPI.CREDENTIALS = "include";
OpenAPI.WITH_CREDENTIALS = true;
OpenAPI.TOKEN = async () => (await fetchApiToken()) ?? "";

export function configureApiToken(tokenResolver?: () => Promise<string | undefined>) {
  OpenAPI.TOKEN = tokenResolver ? async () => (await tokenResolver()) ?? "" : async () => (await fetchApiToken()) ?? "";
}

/**
 * Extracts a human-readable message from an API failure.
 * ApiError.message is only the HTTP status text ("Bad Request") — the backend
 * sends the actionable reason in body.error.message. Prefer it.
 */
export function errorMessage(error: unknown, fallback = "Request failed"): string {
  if (error && typeof error === "object") {
    const body = (error as { body?: { error?: { message?: unknown } } }).body;
    if (typeof body?.error?.message === "string" && body.error.message.length > 0) {
      return body.error.message;
    }
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return fallback;
}
