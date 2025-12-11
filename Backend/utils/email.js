import dotenv from "dotenv";

dotenv.config();

const RESEND_API_URL = "https://api.resend.com/emails";

class EmailSendError extends Error {
  constructor(message, { code, status } = {}) {
    super(message);
    this.name = "EmailSendError";
    this.code = code;
    this.status = status;
  }
}

export const sendEmail = async ({ to, subject, text }) => {
  if (!to || !subject || !text) {
    throw new Error("Missing email payload fields");
  }

  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available; use Node 18+ or add a fetch polyfill");
  }

  const apiKey = process.env.RESEND_API_KEY;

  // In non-production environments, allow registration to continue even if email
  // delivery isn't fully configured. This prevents 500s during local testing
  // while still enforcing real delivery in production.
  if (!apiKey && process.env.NODE_ENV !== "production") {
    console.warn(
      "RESEND_API_KEY is not configured; logging verification email payload for local testing only"
    );
    console.info({ to, subject, text });
    return;
  }

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const from = process.env.EMAIL_FROM || "StepHabit <no-reply@stephabit.app>";

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
    }),
  });

  if (!response.ok) {
    let errorText = await response.text();
    let parsed;

    try {
      parsed = JSON.parse(errorText);
      errorText = parsed?.error?.message || parsed?.message || errorText;
    } catch (err) {
      // Fall back to raw text if JSON parsing fails.
    }

    const isInvalidEmail =
      response.status === 400 ||
      response.status === 422 ||
      /invalid email|email address is not valid/i.test(errorText || "") ||
      /was not sent to/iu.test(errorText || "");

    const message = errorText || response.statusText;

    if (isInvalidEmail) {
      throw new EmailSendError("The email address appears to be invalid.", {
        code: "INVALID_EMAIL",
        status: response.status,
      });
    }

    throw new EmailSendError(`Email send failed: ${message}`, {
      code: "DELIVERY_FAILED",
      status: response.status,
    });
  }
};

export { EmailSendError };
