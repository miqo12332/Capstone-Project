import nodemailer from "nodemailer";

class EmailConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "EmailConfigError";
    this.code = "EMAIL_CONFIG_MISSING";
  }
}

let transporterInstance;

const createTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new EmailConfigError(
      "Email service is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS."
    );
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true" || Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

const getTransporter = () => {
  if (!transporterInstance) {
    transporterInstance = createTransporter();
  }
  return transporterInstance;
};

export const verifyEmailTransport = async () => {
  const transporter = getTransporter();

  try {
    await transporter.verify();
    return true;
  } catch (error) {
    // Add a helpful message for common SMTP issues without failing the server boot.
    const guidance =
      "Verify SMTP_HOST/PORT, the username/password (app password for Gmail), and that outbound SMTP is allowed.";
    throw new Error(`${error.message}. ${guidance}`);
  }
};

export const sendEmail = async ({ to, subject, text }) => {
  const transporter = getTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  await transporter.sendMail({ from, to, subject, text });
};

export { EmailConfigError };

