import { Resend } from "resend";
import { env } from "../env.js";

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(env.RESEND_API_KEY);
  return client;
}

export type MailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export async function sendMail(msg: MailMessage): Promise<{ ok: boolean; id?: string; error?: string }> {
  const c = getClient();
  if (!c) {
    console.log("[mailer] (no RESEND_API_KEY, dry-run)", { to: msg.to, subject: msg.subject });
    return { ok: true, id: "dry-run" };
  }
  try {
    const { data, error } = await c.emails.send({
      from: env.MAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
