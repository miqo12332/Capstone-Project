import nodemailer from "nodemailer";

const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number.isNaN(smtpPort) ? 587 : smtpPort,
  secure: process.env.SMTP_SECURE === "true",
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
});

export const sendVerificationEmail = async (to, code) => {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!process.env.SMTP_HOST || !from) {
    throw new Error("Email transport is not configured");
  }

  const mailOptions = {
    from,
    to,
    subject: "StepHabit email verification code",
    text: `Use this code to complete your registration: ${code}`,
    html: `<p>Use this code to complete your registration:</p><h2>${code}</h2><p>This code expires in 15 minutes.</p>`,
  };

  return transporter.sendMail(mailOptions);
};
