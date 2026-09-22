import nodemailer from "nodemailer";
import { Resend } from "resend";

import { env } from "./env.js";
import { getStringSetting } from "./settings.js";

// Mail config resolves per send: in-app setting → env var. This keeps
// SMTP/Resend editable from the dashboard without restarting the service.
async function resolveMailConfig() {
  const from = (await getStringSetting("mail.from", env.MAIL_FROM))!;
  const resendApiKey = await getStringSetting("mail.resend_api_key", env.RESEND_API_KEY);
  if (resendApiKey) {
    return { from, resendApiKey } as const;
  }
  const host = await getStringSetting("mail.smtp_host", env.SMTP_HOST);
  const portRaw = await getStringSetting("mail.smtp_port", String(env.SMTP_PORT));
  const user = await getStringSetting("mail.smtp_user", env.SMTP_USER);
  const pass = await getStringSetting("mail.smtp_password", env.SMTP_PASSWORD);
  const secureRaw = await getStringSetting("mail.smtp_secure", String(env.SMTP_SECURE));
  return {
    from,
    smtp: host
      ? {
          host,
          port: Number(portRaw) || 1025,
          secure: secureRaw === "true",
          auth: user ? { user, pass } : undefined,
        }
      : undefined,
  } as const;
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const cfg = await resolveMailConfig();

  if ("resendApiKey" in cfg && cfg.resendApiKey) {
    const resend = new Resend(cfg.resendApiKey);
    await resend.emails.send({
      from: cfg.from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return;
  }

  if (!("smtp" in cfg) || !cfg.smtp) {
    // Self-hosted instances may run without mail — auth still works, the
    // email simply never goes out.
    console.warn(
      JSON.stringify({ level: "warn", msg: "mail_skipped_no_transport", to: input.to, subject: input.subject }),
    );
    return;
  }

  await nodemailer.createTransport(cfg.smtp).sendMail({
    from: cfg.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
