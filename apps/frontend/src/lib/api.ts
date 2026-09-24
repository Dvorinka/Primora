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
