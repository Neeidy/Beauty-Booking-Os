/**
 * Email client — uses Resend if RESEND_API_KEY is set, otherwise logs to console.
 * Email send failures are always non-fatal (caller must wrap in try/catch or .catch()).
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const DEFAULT_FROM = "Vienna Glow Studio <noreply@viennaglowstudio.at>";

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, html, from = DEFAULT_FROM } = options;

  const resendApiKey = process.env["RESEND_API_KEY"];

  if (!resendApiKey) {
    // V1 fallback — log and pretend success (no real sending)
    console.log(
      `[email] Would send email\n  To: ${to}\n  From: ${from}\n  Subject: ${subject}\n  (RESEND_API_KEY not set — email not sent)`
    );
    return { success: true, messageId: "dev-console-log" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown error");
      return { success: false, error: `Resend API error ${response.status}: ${errorText}` };
    }

    const data = await response.json() as { id?: string };
    return { success: true, ...(data.id !== undefined ? { messageId: data.id } : {}) };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
