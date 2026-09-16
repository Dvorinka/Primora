import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  AUTH_PORT: z.string().default("3001"),
  DATABASE_URL: z.string().min(1),
  DRAGONFLY_URL: z.string().default("redis://localhost:6379/0"),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().url(),
  AUTH_BASE_URL: z.string().url().optional(),
  VITE_APP_URL: z.string().url(),
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  JWT_TTL_SECONDS: z.string().default("900"),
  MAIL_FROM: z.string().min(1),
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default("1025"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().optional(),
  AUTH_ADMIN_EMAILS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    "Invalid auth environment:\n" + JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
}

export const env = {
  ...parsed.data,
  AUTH_PORT: Number(parsed.data.AUTH_PORT),
  JWT_TTL_SECONDS: Number(parsed.data.JWT_TTL_SECONDS),
  SMTP_PORT: Number(parsed.data.SMTP_PORT),
  AUTH_BASE_URL: parsed.data.AUTH_BASE_URL ?? parsed.data.BETTER_AUTH_URL,
};

