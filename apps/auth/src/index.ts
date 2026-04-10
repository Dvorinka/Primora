import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { HTTPException } from "hono/http-exception";
import { createClient } from "redis";

import { auth, authPool, runAuthMigrations } from "./lib/auth.js";
import { env } from "./lib/env.js";

const redisClient = createClient({
  url: env.DRAGONFLY_URL,
});

try {
  await redisClient.connect();
} catch (error) {
  console.warn(JSON.stringify({ level: "warn", msg: "dragonfly unavailable", error }));
}

await retry("auth_migrations", runAuthMigrations);

const app = new Hono();

app.use("*", requestId());
app.use("*", logger());

app.use("/auth/*", async (c, next) => {
  if (!redisClient.isOpen) {
    await next();
    return;
  }
  const identifier = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
  const windowKey = `rate-limit:auth:${identifier}:${new Date().toISOString().slice(0, 16)}`;
  const count = await redisClient.incr(windowKey);
  await redisClient.expire(windowKey, 60);
  if (count > 60) {
    throw new HTTPException(429, { message: "Too many auth requests" });
  }
  await next();
});

app.get("/health", async (c) => {
  let db = "ok";
  let cache = redisClient.isOpen ? "ok" : "disabled";
  try {
    await authPool.query("select 1");
  } catch (error) {
    db = error instanceof Error ? error.message : "error";
  }
  if (redisClient.isOpen) {
    try {
      await redisClient.ping();
    } catch (error) {
      cache = error instanceof Error ? error.message : "error";
    }
  }
  return c.json({
    status: db === "ok" ? "ok" : "degraded",
    checks: { database: db, dragonfly: cache },
  });
});

app.on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw));

serve({
  fetch: app.fetch,
  port: env.AUTH_PORT,
});

async function retry(label: string, fn: () => Promise<void>) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await fn();
      return;
    } catch (error) {
      lastError = error;
      console.warn(JSON.stringify({ level: "warn", msg: `${label}_retry`, attempt, error }));
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw lastError;
}
