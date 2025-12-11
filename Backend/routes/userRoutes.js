import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { UserSetting } from "../models/index.js";
import { sendEmail, EmailSendError } from "../utils/email.js";

const defaultSettings = {
  timezone: "UTC",
  daily_reminder_time: "08:00",
  weekly_summary_day: "Sunday",
  email_notifications: true,
  push_notifications: false,
  share_activity: true,
  theme: "light",
};

const generateVerificationCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const sendVerificationEmail = async (email, code) => {
  const subject = "Verify your StepHabit account";
  const text = `Use this code to verify your StepHabit account: ${code}. It expires in 15 minutes.`;

  return sendEmail({ to: email, subject, text });
};

const sanitizeString = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const normalizeEmail = (value = "") => value.trim().toLowerCase();

const isValidEmail = (value = "") => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  // Basic RFC 5322-compliant pattern; intentionally permissive but screens out obvious typos.
  const emailPattern =
    /^(?:[a-zA-Z0-9_'^&+{}-]+(?:\.[a-zA-Z0-9_'^&+{}-]+)*|".+")@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  return emailPattern.test(trimmed);
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
  createdAt: user.createdAt || user.created_at,
  updatedAt: user.updatedAt || user.updated_at,
  isVerified: Boolean(user.is_verified),
  verifiedAt: user.verified_at,
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

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, onboarding = {} } = req.body;
    const normalizedEmail = normalizeEmail(email || "");
    if (!name || !normalizedEmail || !password) return res.status(400).json({ error: "All fields required" });
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const verificationCode = generateVerificationCode();
    const hashedVerification = await bcrypt.hash(verificationCode, 10);
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);
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
      email: normalizedEmail,
      password: hashed,
      primary_goal: sanitizeString(onboardingPayload.primaryGoal),
      focus_area: sanitizeString(onboardingPayload.focusArea),
      experience_level: sanitizeString(onboardingPayload.experienceLevel),
      daily_commitment: sanitizeString(onboardingPayload.dailyCommitment),
      support_preference: sanitizeString(onboardingPayload.supportPreference),
      motivation_statement: sanitizeString(onboardingPayload.motivation),
      is_verified: false,
      verification_code: hashedVerification,
      verification_expires_at: verificationExpires,
    });
    await UserSetting.findOrCreate({
      where: { user_id: newUser.id },
      defaults: { ...defaultSettings, user_id: newUser.id },
    });

    let deliveryResult;
    try {
      deliveryResult = await sendVerificationEmail(newUser.email, verificationCode);
    } catch (emailErr) {
      console.error("Failed to send verification email", emailErr);
      await UserSetting.destroy({ where: { user_id: newUser.id } });
      await newUser.destroy();

      if (emailErr instanceof EmailSendError) {
        if (emailErr.code === "INVALID_EMAIL") {
          return res.status(400).json({ error: "Please enter a valid email address." });
        }

        if (emailErr.code === "DELIVERY_NOT_CONFIGURED") {
          return res.status(503).json({
            error:
              "Email delivery is not configured. Please add RESEND_API_KEY and EMAIL_FROM to the server environment.",
          });
        }
      }

      return res
        .status(500)
        .json({ error: emailErr.message || "Could not send verification email. Please try again." });
    }

    res.status(201).json({
      message:
        deliveryResult?.logged
          ? "Email delivery is not configured; the verification code was logged to the server console."
          : "Verification code sent to your email.",
      email: newUser.email,
      userId: newUser.id,
      deliveryStatus: deliveryResult?.logged ? "logged" : "sent",
      loggedCode: deliveryResult?.logged ? verificationCode : undefined,
      user: serializeUser({ ...newUser.get({ plain: true }), settings: await ensureUserSettings(newUser.id) }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Verify email
router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body;
    const normalizedEmail = normalizeEmail(email || "");
    if (!normalizedEmail || !code) {
      return res.status(400).json({ error: "Email and verification code are required" });
    }

    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.is_verified) return res.status(400).json({ error: "Email already verified" });

    if (!user.verification_code || !user.verification_expires_at) {
      return res.status(400).json({ error: "No verification code found. Please request a new one." });
    }

    if (new Date(user.verification_expires_at) < new Date()) {
      return res.status(400).json({ error: "Verification code has expired" });
    }

    const isMatch = await bcrypt.compare(code, user.verification_code);
    if (!isMatch) return res.status(400).json({ error: "Invalid verification code" });

    user.is_verified = true;
    user.verified_at = new Date();
    user.verification_code = null;
    user.verification_expires_at = null;
    await user.save();

    await user.reload({ include: [{ model: UserSetting, as: "settings" }] });

    res.json({ message: "Email verified successfully", user: serializeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to verify email" });
  }
});

// Resend verification code
router.post("/resend-code", async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email || "");
    if (!normalizedEmail) return res.status(400).json({ error: "Email is required" });
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.is_verified) return res.status(400).json({ error: "Email already verified" });

    const verificationCode = generateVerificationCode();
    const hashedVerification = await bcrypt.hash(verificationCode, 10);

    user.verification_code = hashedVerification;
    user.verification_expires_at = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    let deliveryResult;
    try {
      deliveryResult = await sendVerificationEmail(normalizedEmail, verificationCode);
    } catch (emailErr) {
      console.error("Failed to send verification email", emailErr);

      if (emailErr instanceof EmailSendError) {
        if (emailErr.code === "INVALID_EMAIL") {
          return res.status(400).json({ error: "Please enter a valid email address." });
        }

        if (emailErr.code === "DELIVERY_NOT_CONFIGURED") {
          return res.status(503).json({
            error:
              "Email delivery is not configured. Please add RESEND_API_KEY and EMAIL_FROM to the server environment.",
          });
        }
      }

      return res.status(500).json({ error: emailErr.message || "Could not send verification email. Please try again." });
    }

    res.json({
      message: deliveryResult?.logged
        ? "Email delivery is not configured; the verification code was logged to the server console."
        : "A new verification code has been sent.",
      deliveryStatus: deliveryResult?.logged ? "logged" : "sent",
      loggedCode: deliveryResult?.logged ? verificationCode : undefined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to resend verification code" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email || "");
    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const user = await User.findOne({
      where: { email: normalizedEmail },
      include: [{ model: UserSetting, as: "settings" }],
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid password" });

    if (!user.is_verified) {
      return res.status(403).json({ error: "Email not verified. Please check your inbox for the 6-digit code." });
    }

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
    const normalizedEmail = typeof email === "string" ? normalizeEmail(email) : null;

    const user = await User.findByPk(id, {
      include: [{ model: UserSetting, as: "settings" }],
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (normalizedEmail && normalizedEmail !== user.email) {
      const existing = await User.findOne({
        where: { email: normalizedEmail, id: { [Op.ne]: user.id } },
      });
      if (existing) return res.status(400).json({ error: "Email already in use" });
    }

    if (typeof name === "string" && name.trim()) user.name = name.trim();
    if (normalizedEmail) user.email = normalizedEmail;

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
    };

    updates.daily_reminder_time = settings.dailyReminderTime || null;
    updates.email_notifications = Boolean(
      typeof settings.emailNotifications === "boolean"
        ? settings.emailNotifications
        : defaultSettings.email_notifications
    );
    updates.push_notifications = Boolean(
      typeof settings.pushNotifications === "boolean"
        ? settings.pushNotifications
        : defaultSettings.push_notifications
    );
    updates.share_activity = Boolean(
      typeof settings.shareActivity === "boolean"
        ? settings.shareActivity
        : defaultSettings.share_activity
    );

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
