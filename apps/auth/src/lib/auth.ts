import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { getMigrations } from "better-auth/db/migration";
import { Pool } from "pg";

import { sendTransactionalEmail } from "./mail.js";
import { env } from "./env.js";

export const authPool = new Pool({
  connectionString: env.DATABASE_URL,
});

const socialProviders = {
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
};

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
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      await sendTransactionalEmail({
        to: user.email,
        subject: "Verify your Primora email",
        text: `Verify your Primora email: ${url}`,
        html: `<p>Verify your Primora email.</p><p><a href="${url}">Verify email</a></p>`,
      });
    },
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
  ],
});

export async function runAuthMigrations() {
  const migrations = await getMigrations(auth.options);
  await migrations.runMigrations();
}

