// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
//@ts-nocheck

const SENDGRID_SEND_URL = "https://api.sendgrid.com/v3/mail/send";

export function sendGridFromAddress(): string {
  return process.env.SENDGRID_FROM_EMAIL || "noreply@pebecsec.com";
}

export function sendGridErrorMessage(error: unknown): string {
  const err = error as {
    sendgridBody?: { errors?: Array<{ message?: string }> };
    message?: string;
  };
  const fromBody = err?.sendgridBody?.errors?.[0]?.message;
  if (fromBody) return fromBody;
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Sends one HTML email via SendGrid HTTP API (no @sendgrid/mail — avoids Node `fs` in Convex bundle).
 */
export async function sendGridHtmlEmail(args: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<{ messageId?: string }> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error("Missing SENDGRID_API_KEY in Convex environment.");
  }
  const from = args.from ?? sendGridFromAddress();
  const res = await fetch(SENDGRID_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: args.to }]
        }
      ],
      from: { email: from },
      subject: args.subject,
      content: [{ type: "text/html", value: args.html }]
    })
  });

  const messageId = res.headers.get("x-message-id") || undefined;

  if (!res.ok) {
    let parsed: { errors?: Array<{ message?: string }> } | null = null;
    const text = await res.text();
    try {
      parsed = JSON.parse(text) as { errors?: Array<{ message?: string }> };
    } catch {
      parsed = null;
    }
    const msg =
      parsed?.errors?.[0]?.message ||
      text ||
      `SendGrid request failed (${res.status})`;
    const err = new Error(msg) as Error & { sendgridBody?: typeof parsed };
    err.sendgridBody = parsed;
    throw err;
  }

  return { messageId };
}
