import crypto from "crypto";

let transporterPromise = null;

const buildBaseUrl = () => {
  const configuredBase = process.env.APP_BASE_URL || process.env.FRONTEND_URL || process.env.BASE_URL;
  if (configuredBase) {
    return configuredBase.replace(/\/$/, "");
  }
  const port = process.env.PORT || 5001;
  return `http://localhost:${port}`;
};

const buildVerificationUrl = (token) => {
  const base = buildBaseUrl();
  return `${base}/api/users/verify?code=${encodeURIComponent(token)}`;
};

const loadTransporter = async () => {
  if (transporterPromise) return transporterPromise;

  const requiredFields = [
    process.env.SMTP_HOST,
    process.env.SMTP_PORT,
    process.env.SMTP_USER,
    process.env.SMTP_PASS,
    process.env.EMAIL_FROM,
  ];

  const smtpConfigured = requiredFields.every(Boolean);

  transporterPromise = (async () => {
    if (!smtpConfigured) {
      console.warn("SMTP credentials are not fully configured; verification emails will be logged instead.");
      return null;
    }

    try {
      const nodemailer = await import("nodemailer");
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    } catch (err) {
      console.warn(
        "Nodemailer is not available; verification emails will be logged instead. Ensure nodemailer is installed.",
        err?.message || err
      );
      return null;
    }
  })();

  return transporterPromise;
};

export const generateVerificationToken = () => crypto.randomBytes(32).toString("hex");

export const sendVerificationEmail = async (recipient, token) => {
  const transporter = await loadTransporter();
  const verificationUrl = buildVerificationUrl(token);

  const emailPayload = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: recipient,
    subject: "Verify your StepHabit email",
    text: `Welcome to StepHabit! Please verify your email by visiting: ${verificationUrl}`,
    html: `
      <p>Welcome to StepHabit!</p>
      <p>Please verify your email by clicking the link below:</p>
      <p><a href="${verificationUrl}">Verify my email</a></p>
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      <p>${verificationUrl}</p>
    `,
  };

  if (!transporter) {
    console.info(`[Email disabled] Verification link for ${recipient}: ${verificationUrl}`);
    return { delivered: false, verificationUrl };
  }

  await transporter.sendMail(emailPayload);
  return { delivered: true, verificationUrl };
};

export const __testHooks = {
  buildVerificationUrl,
};
