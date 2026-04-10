import { createAuthClient } from "better-auth/solid";

// Use full URL for dev mode, relative path for production
const baseURL = import.meta.env.VITE_AUTH_BASE_URL ?? "http://localhost/auth";

export const authClient = createAuthClient({
  baseURL,
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
