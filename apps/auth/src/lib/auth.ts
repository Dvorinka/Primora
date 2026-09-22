import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { admin, jwt } from "better-auth/plugins";
import { getMigrations } from "better-auth/db/migration";

import { authPool } from "./db.js";
import { sendTransactionalEmail } from "./mail.js";
import { getBoolSetting } from "./settings.js";
import { env } from "./env.js";

// OAuth providers exist only on the managed tier (PRIMORA_MANAGED=true).
// Self-hosted instances are email/password only — the env keys are ignored
// unless the managed flag is set.
const socialProviders = env.PRIMORA_MANAGED
  ? {
      ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
        ? {
            github: {
              clientId: env.GITHUB_CLIENT_ID,
              clientSecret: env.GITHUB_CLIENT_SECRET,
            },
          }
        : {}),
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            },
          }
        : {}),
      ...(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET
        ? {
            discord: {
              clientId: env.DISCORD_CLIENT_ID,
              clientSecret: env.DISCORD_CLIENT_SECRET,
            },
          }
        : {}),
      ...(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET
        ? {
            microsoft: {
              clientId: env.MICROSOFT_CLIENT_ID,
              clientSecret: env.MICROSOFT_CLIENT_SECRET,
              tenantId: env.MICROSOFT_TENANT_ID,
            },
          }
        : {}),
    }
  : {};

export const auth = betterAuth({
  appName: "Primora",
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.VITE_APP_URL, env.AUTH_BASE_URL],
  database: authPool,
  emailAndPassword: {
    enabled: true,
    async sendResetPassword({ user, url }) {
      await sendTransactionalEmail({
        to: user.email,
        subject: "Reset your Primora password",
        text: `Reset your Primora password: ${url}`,
        html: `<p>Reset your Primora password.</p><p><a href="${url}">Reset password</a></p>`,
      });
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Gates only the public sign-up endpoint. Users created through the
        // admin plugin or OAuth callbacks take different paths and pass.
        async before(user, ctx) {
          if (ctx?.path !== "/sign-up/email") return;
          const { rows } = await authPool.query<{ n: number }>(
            `select count(*)::int as n from "user"`,
          );
          if (rows[0].n === 0) {
            // Bootstrap: the first public signup becomes the instance admin.
            return { data: { ...user, role: "admin" } };
          }
          const enabled = await getBoolSetting("auth.signup_enabled", env.SIGNUP_ENABLED);
          if (!enabled) {
            throw new APIError("FORBIDDEN", {
              message: "Sign-up is disabled on this instance.",
            });
          }
        },
      },
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      // Verification is optional — a misconfigured transport must not fail
      // sign-up or sign-in.
      try {
        await sendTransactionalEmail({
          to: user.email,
          subject: "Verify your Primora email",
          text: `Verify your Primora email: ${url}`,
          html: `<p>Verify your Primora email.</p><p><a href="${url}">Verify email</a></p>`,
        });
      } catch (error) {
        console.warn(JSON.stringify({ level: "warn", msg: "verification_email_failed", error }));
      }
    },
  },
  // Enabled unconditionally — better-auth only turns this on when NODE_ENV is
  // production, but the shipped .env defaults to development. Credential
  // endpoints get 3 req/10s; the IP-level limiter in index.ts sits in front.
  rateLimit: {
    enabled: true,
  },
  socialProviders,
  plugins: [
    jwt({
      jwt: {
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
        expirationTime: `${env.JWT_TTL_SECONDS} seconds`,
        getSubject({ user }) {
          return user.id;
        },
        definePayload({ user, session }) {
          return {
            sid: session.id,
            email: user.email,
            email_verified: user.emailVerified,
            name: user.name,
          };
        },
      },
    }),
    admin(),
  ],
});

export async function runAuthMigrations() {
  const migrations = await getMigrations(auth.options);
  await migrations.runMigrations();
}

/** Bootstrap admins by email — run after migrations so the role column exists. */
export async function promoteAdminEmails() {
  const emails = (env.AUTH_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (emails.length === 0) return;
  await authPool.query(`update "user" set role = 'admin' where lower(email) = any($1)`, [emails]);
}

