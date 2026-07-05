import { Resend } from "resend";
import { z } from "zod";

const defaultPublicContactEmail = "feedback@danceclip.org.com";
const defaultContactRecipientEmail = "zhenyufang162@gmail.com";
const contactEmailSenderName = "DanceClip AI";

type ContactEmailEnv = Record<string, string | undefined>;

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(4000),
  company: z.string().trim().max(0).optional(),
});

export type ContactMessage = z.infer<typeof contactMessageSchema>;

export class ContactEmailConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContactEmailConfigError";
  }
}

export class ContactEmailSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContactEmailSendError";
  }
}

export function getContactEmailSettings(env: ContactEmailEnv = process.env) {
  if (!env.RESEND_API_KEY) {
    throw new ContactEmailConfigError("RESEND_API_KEY is required to send contact email.");
  }

  const publicContactEmail = env.NEXT_PUBLIC_CONTACT_EMAIL || defaultPublicContactEmail;

  return {
    apiKey: env.RESEND_API_KEY,
    from: env.RESEND_FROM_EMAIL || `${contactEmailSenderName} <${publicContactEmail}>`,
    to: env.CONTACT_RECIPIENT_EMAIL || defaultContactRecipientEmail,
  };
}

export async function sendContactEmail(message: ContactMessage) {
  const settings = getContactEmailSettings();
  const resend = new Resend(settings.apiKey);
  const { data, error } = await resend.emails.send({
    from: settings.from,
    to: settings.to,
    replyTo: message.email,
    subject: `DanceClip AI contact: ${message.subject}`,
    text: buildContactEmailText(message),
    html: buildContactEmailHtml(message),
  });

  if (error) {
    throw new ContactEmailSendError(error.message || "Resend could not send the contact email.");
  }

  return {
    id: data?.id,
  };
}

export function buildContactEmailText(message: ContactMessage) {
  return [
    `Name: ${message.name}`,
    `Email: ${message.email}`,
    `Subject: ${message.subject}`,
    "",
    message.message,
  ].join("\n");
}

export function buildContactEmailHtml(message: ContactMessage) {
  return `
    <div style="font-family: Arial, sans-serif; color: #090907; line-height: 1.55;">
      <h1 style="font-size: 20px; margin: 0 0 16px;">New DanceClip AI contact message</h1>
      <p><strong>Name:</strong> ${escapeHtml(message.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(message.email)}</p>
      <p><strong>Subject:</strong> ${escapeHtml(message.subject)}</p>
      <div style="margin-top: 20px; white-space: pre-wrap;">${escapeHtml(message.message)}</div>
    </div>
  `.trim();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
