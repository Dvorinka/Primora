import { createAuthClient } from "better-auth/solid";
import { adminClient } from "better-auth/client/plugins";

// Same-origin default — nginx routes /auth to the auth service at whatever
// port or domain serves the app. better-auth requires an absolute baseURL, so
// resolve it against the runtime origin; VITE_AUTH_BASE_URL overrides for
// split-origin setups.
const baseURL =
  import.meta.env.VITE_AUTH_BASE_URL ?? new URL("/auth", window.location.origin).href;

export const authClient = createAuthClient({
  baseURL,
  plugins: [adminClient()],
});

export async function fetchApiToken() {
  const response = await fetch(`${baseURL}/token`, {
    credentials: "include",
    headers: {
      accept: "application/json",
    },
  });

  if (response.status === 401 || response.status === 403) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch API token (${response.status})`);
  }

  const data = (await response.json()) as { token: string };
  return data.token;
}
