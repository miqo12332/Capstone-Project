import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, EMAIL_FROM } =
  process.env;

const transportOptions = {
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 587,
  secure: SMTP_SECURE === "true",
};

if (SMTP_USER && SMTP_PASS) {
  transportOptions.auth = { user: SMTP_USER, pass: SMTP_PASS };
}

const transporter = nodemailer.createTransport(transportOptions);

export const sendVerificationEmail = async (recipientEmail, code) => {
  if (!SMTP_HOST) {
    console.warn("SMTP_HOST is not configured; skipping verification email send.");
    return;
  }

  const message = {
    from: EMAIL_FROM || SMTP_USER,
    to: recipientEmail,
    subject: "StepHabit Email Verification",
    text: `Your StepHabit verification code is ${code}. This code will expire in 15 minutes.`,
  };

  await transporter.sendMail(message);
};

export default transporter;
