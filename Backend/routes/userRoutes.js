import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { PasswordReset, RegistrationVerification, UserSetting } from "../models/index.js";
import { EmailConfigError, sendEmail } from "../utils/emailService.js";

const defaultSettings = {
  timezone: "UTC",
  daily_reminder_time: "08:00",
  weekly_summary_day: "Sunday",
  email_notifications: true,
  push_notifications: false,
  share_activity: true,
  theme: "light",
  ai_tone: "balanced",
  support_style: "celebrate",
  email_alerts: true,
  push_reminders: false,
  google_calendar: false,
  apple_calendar: false,
  fitness_sync: false,
};

const sanitizeString = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const formatSettings = (settingsInstance) => {
  if (!settingsInstance) {
    return {
      timezone: defaultSettings.timezone,
      dailyReminderTime: defaultSettings.daily_reminder_time,
      weeklySummaryDay: defaultSettings.weekly_summary_day,
      emailNotifications: defaultSettings.email_notifications,
      pushNotifications: defaultSettings.push_notifications,
      shareActivity: defaultSettings.share_activity,
      theme: defaultSettings.theme,
      aiTone: defaultSettings.ai_tone,
      supportStyle: defaultSettings.support_style,
      emailAlerts: defaultSettings.email_alerts,
      pushReminders: defaultSettings.push_reminders,
      googleCalendar: defaultSettings.google_calendar,
      appleCalendar: defaultSettings.apple_calendar,
      fitnessSync: defaultSettings.fitness_sync,
    };
  }

  const settings = settingsInstance.get({ plain: true });
  return {
    timezone: settings.timezone,
    dailyReminderTime: settings.daily_reminder_time,
    weeklySummaryDay: settings.weekly_summary_day,
    emailNotifications: settings.email_notifications,
    pushNotifications: settings.push_notifications,
    shareActivity: settings.share_activity,
    theme: settings.theme,
    aiTone: settings.ai_tone,
    supportStyle: settings.support_style,
    emailAlerts: settings.email_alerts ?? settings.email_notifications,
    pushReminders: settings.push_reminders ?? settings.push_notifications,
    googleCalendar: settings.google_calendar,
    appleCalendar: settings.apple_calendar,
    fitnessSync: settings.fitness_sync,
  };
};

const serializeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  age: user.age,
  gender: user.gender,
  bio: user.bio,
  avatar: user.avatar || "/uploads/default-avatar.png",
  primaryGoal: user.primary_goal,
  focusArea: user.focus_area,
  experienceLevel: user.experience_level,
  dailyCommitment: user.daily_commitment,
  supportPreference: user.support_preference,
  motivation: user.motivation_statement,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  settings: formatSettings(user.settings),
});

const ensureUserSettings = async (userId) => {
  const [settings] = await UserSetting.findOrCreate({
    where: { user_id: userId },
    defaults: { ...defaultSettings, user_id: userId },
  });
  return settings;
};

const router = express.Router();

const VERIFICATION_EXPIRATION_MINUTES = 15;
const PASSWORD_REQUIREMENTS_MESSAGE = "Password must be at least 8 characters and include letters and numbers.";

const isPasswordStrong = (password) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password);

const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const buildVerificationPayload = ({ name, email, password, onboarding }) => ({
  name,
  email,
  password,
  onboarding,
});

const persistVerification = async ({ email, code, payload }) => {
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRATION_MINUTES * 60 * 1000);

  const [record] = await RegistrationVerification.upsert({
    email,
    code_hash: codeHash,
    payload,
    expires_at: expiresAt,
  });

  return record;
};

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, onboarding = {} } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "All fields required" });

    if (!isPasswordStrong(password)) {
      return res.status(400).json({ error: PASSWORD_REQUIREMENTS_MESSAGE });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const onboardingPayload = {
      primaryGoal: onboarding.primaryGoal ?? req.body.primaryGoal ?? null,
      focusArea: onboarding.focusArea ?? req.body.focusArea ?? null,
      experienceLevel: onboarding.experienceLevel ?? req.body.experienceLevel ?? null,
      dailyCommitment: onboarding.dailyCommitment ?? req.body.dailyCommitment ?? null,
      supportPreference: onboarding.supportPreference ?? req.body.supportPreference ?? null,
      motivation: onboarding.motivation ?? req.body.motivation ?? null,
    };

    const newUser = await User.create({
      name,
      email,
      password: hashed,
      primary_goal: sanitizeString(onboardingPayload.primaryGoal),
      focus_area: sanitizeString(onboardingPayload.focusArea),
      experience_level: sanitizeString(onboardingPayload.experienceLevel),
      daily_commitment: sanitizeString(onboardingPayload.dailyCommitment),
      support_preference: sanitizeString(onboardingPayload.supportPreference),
      motivation_statement: sanitizeString(onboardingPayload.motivation),
    });
    await UserSetting.findOrCreate({
      where: { user_id: newUser.id },
      defaults: { ...defaultSettings, user_id: newUser.id },
    });

    res.status(201).json({
      message: "User created",
      user: serializeUser({ ...newUser.get({ plain: true }), settings: await ensureUserSettings(newUser.id) }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/register/request-code", async (req, res) => {
  try {
    const { name, email, password, onboarding = {} } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "All fields required" });

    if (!isPasswordStrong(password)) {
      return res.status(400).json({ error: PASSWORD_REQUIREMENTS_MESSAGE });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const onboardingPayload = {
      primaryGoal: onboarding.primaryGoal ?? req.body.primaryGoal ?? null,
      focusArea: onboarding.focusArea ?? req.body.focusArea ?? null,
      experienceLevel: onboarding.experienceLevel ?? req.body.experienceLevel ?? null,
      dailyCommitment: onboarding.dailyCommitment ?? req.body.dailyCommitment ?? null,
      supportPreference: onboarding.supportPreference ?? req.body.supportPreference ?? null,
      motivation: onboarding.motivation ?? req.body.motivation ?? null,
    };

    const code = generateVerificationCode();
    const payload = buildVerificationPayload({ name, email, password: hashedPassword, onboarding: onboardingPayload });
    await persistVerification({ email, code, payload });

    await sendEmail({
      to: email,
      subject: "Your StepHabit verification code",
      text: `Use this code to finish creating your account: ${code}\n\nThe code expires in ${VERIFICATION_EXPIRATION_MINUTES} minutes. If you didn't request this, you can ignore the email.`,
    });

    res.status(200).json({ message: "Verification code sent" });
  } catch (err) {
    console.error("Verification email error:", err);
    if (err instanceof EmailConfigError) {
      return res.status(503).json({
        error: "Email service is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.",
        code: err.code,
      });
    }

    res.status(500).json({ error: "Unable to send verification code. Please confirm the email address." });
  }
});

router.post("/register/verify", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: "Email and code are required" });

    const verification = await RegistrationVerification.findOne({ where: { email } });
    if (!verification) return res.status(400).json({ error: "No verification request found for this email" });

    if (new Date(verification.expires_at) < new Date()) {
      await verification.destroy();
      return res.status(400).json({ error: "Verification code has expired" });
    }

    const isValidCode = await bcrypt.compare(code, verification.code_hash);
    if (!isValidCode) return res.status(400).json({ error: "Invalid verification code" });

    const { name, password, onboarding } = verification.payload;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      await verification.destroy();
      return res.status(400).json({ error: "Email already exists" });
    }

    const newUser = await User.create({
      name,
      email,
      password,
      primary_goal: sanitizeString(onboarding.primaryGoal),
      focus_area: sanitizeString(onboarding.focusArea),
      experience_level: sanitizeString(onboarding.experienceLevel),
      daily_commitment: sanitizeString(onboarding.dailyCommitment),
      support_preference: sanitizeString(onboarding.supportPreference),
      motivation_statement: sanitizeString(onboarding.motivation),
    });
    await UserSetting.findOrCreate({
      where: { user_id: newUser.id },
      defaults: { ...defaultSettings, user_id: newUser.id },
    });

    await verification.destroy();

    res.status(201).json({
      message: "User created",
      user: serializeUser({ ...newUser.get({ plain: true }), settings: await ensureUserSettings(newUser.id) }),
    });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

router.post("/password/reset/request", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: "No account found for that email" });

    const code = generateVerificationCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRATION_MINUTES * 60 * 1000);

    await PasswordReset.upsert({ email, code_hash: codeHash, expires_at: expiresAt });

    await sendEmail({
      to: email,
      subject: "Reset your StepHabit password",
      text: `Use this 6-digit code to reset your password: ${code}\n\nThe code expires in ${VERIFICATION_EXPIRATION_MINUTES} minutes. If you didn't request this, you can ignore the email.`,
    });

    res.json({ message: "Reset code sent" });
  } catch (err) {
    console.error("Password reset request error:", err);
    if (err instanceof EmailConfigError) {
      return res.status(503).json({
        error: "Email service is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.",
        code: err.code,
      });
    }

    res.status(500).json({ error: "Unable to send reset code. Please try again." });
  }
});

router.post("/password/reset/verify", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "Email, code, and new password are required" });
    }

    if (!isPasswordStrong(newPassword)) {
      return res.status(400).json({ error: PASSWORD_REQUIREMENTS_MESSAGE });
    }

    const request = await PasswordReset.findOne({ where: { email } });
    if (!request) return res.status(400).json({ error: "No reset request found for this email" });

    if (new Date(request.expires_at) < new Date()) {
      await request.destroy();
      return res.status(400).json({ error: "Reset code has expired" });
    }

    const isValid = await bcrypt.compare(code, request.code_hash);
    if (!isValid) return res.status(400).json({ error: "Invalid reset code" });

    const user = await User.findOne({ where: { email } });
    if (!user) {
      await request.destroy();
      return res.status(404).json({ error: "No account found for that email" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashed });
    await request.destroy();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password reset verify error:", err);
    res.status(500).json({ error: "Unable to reset password right now" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({
      where: { email },
      include: [{ model: UserSetting, as: "settings" }],
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid password" });

    await ensureUserSettings(user.id);

    res.json({ message: "Login successful", user: serializeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Fetch profile + settings
router.get("/profile/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [{ model: UserSetting, as: "settings" }],
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    await ensureUserSettings(user.id);

    res.json({ user: serializeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

// Update profile + settings
router.put("/profile/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, age, gender, bio, settings = {} } = req.body;

    const user = await User.findByPk(id, {
      include: [{ model: UserSetting, as: "settings" }],
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (email && email !== user.email) {
      const existing = await User.findOne({
        where: { email, id: { [Op.ne]: user.id } },
      });
      if (existing) return res.status(400).json({ error: "Email already in use" });
    }

    if (typeof name === "string" && name.trim()) user.name = name.trim();
    if (typeof email === "string" && email.trim()) user.email = email.trim();

    if (typeof age !== "undefined") {
      if (age === null || age === "") {
        user.age = null;
      } else {
        const parsedAge = parseInt(age, 10);
        if (!Number.isNaN(parsedAge) && parsedAge >= 0) {
          user.age = parsedAge;
        }
      }
    }

    if (typeof gender !== "undefined") user.gender = gender || null;
    if (typeof bio !== "undefined") user.bio = bio || null;

    if (typeof req.body.primaryGoal !== "undefined") {
      user.primary_goal = sanitizeString(req.body.primaryGoal);
    }
    if (typeof req.body.focusArea !== "undefined") {
      user.focus_area = sanitizeString(req.body.focusArea);
    }
    if (typeof req.body.experienceLevel !== "undefined") {
      user.experience_level = sanitizeString(req.body.experienceLevel);
    }
    if (typeof req.body.dailyCommitment !== "undefined") {
      user.daily_commitment = sanitizeString(req.body.dailyCommitment);
    }
    if (typeof req.body.supportPreference !== "undefined") {
      user.support_preference = sanitizeString(req.body.supportPreference);
    }
    if (typeof req.body.motivation !== "undefined") {
      user.motivation_statement = sanitizeString(req.body.motivation);
    }

    await user.save();

    const settingsRecord = await ensureUserSettings(user.id);

    const updates = {
      timezone: settings.timezone || defaultSettings.timezone,
      weekly_summary_day: settings.weeklySummaryDay || defaultSettings.weekly_summary_day,
      theme: settings.theme || defaultSettings.theme,
      ai_tone: settings.aiTone || defaultSettings.ai_tone,
      support_style: settings.supportStyle || defaultSettings.support_style,
      email_notifications: Boolean(
        typeof settings.emailNotifications === "boolean"
          ? settings.emailNotifications
          : settings.emailAlerts ?? defaultSettings.email_notifications
      ),
      push_notifications: Boolean(
        typeof settings.pushNotifications === "boolean"
          ? settings.pushNotifications
          : settings.pushReminders ?? defaultSettings.push_notifications
      ),
      share_activity: Boolean(
        typeof settings.shareActivity === "boolean"
          ? settings.shareActivity
          : defaultSettings.share_activity
      ),
      email_alerts: Boolean(
        typeof settings.emailAlerts === "boolean"
          ? settings.emailAlerts
          : settings.emailNotifications ?? defaultSettings.email_alerts
      ),
      push_reminders: Boolean(
        typeof settings.pushReminders === "boolean"
          ? settings.pushReminders
          : settings.pushNotifications ?? defaultSettings.push_reminders
      ),
      google_calendar: Boolean(settings.googleCalendar ?? defaultSettings.google_calendar),
      apple_calendar: Boolean(settings.appleCalendar ?? defaultSettings.apple_calendar),
      fitness_sync: Boolean(settings.fitnessSync ?? defaultSettings.fitness_sync),
    };

    updates.daily_reminder_time = settings.dailyReminderTime || null;

    await settingsRecord.update(updates);

    const refreshedUser = await User.findByPk(id, {
      include: [{ model: UserSetting, as: "settings" }],
    });

    res.json({ message: "Profile updated", user: serializeUser(refreshedUser) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
