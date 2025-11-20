import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { UserSetting } from "../models/index.js";
import { sendVerificationEmail } from "../utils/email.js";

const defaultSettings = {
  timezone: "UTC",
  daily_reminder_time: "08:00",
  weekly_summary_day: "Sunday",
  email_notifications: true,
  push_notifications: false,
  share_activity: true,
  theme: "light",
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
  isVerified: Boolean(user.is_verified),
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

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, onboarding = {} } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "All fields required" });

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
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
      email,
      password: hashed,
      primary_goal: sanitizeString(onboardingPayload.primaryGoal),
      focus_area: sanitizeString(onboardingPayload.focusArea),
      experience_level: sanitizeString(onboardingPayload.experienceLevel),
      daily_commitment: sanitizeString(onboardingPayload.dailyCommitment),
      support_preference: sanitizeString(onboardingPayload.supportPreference),
      motivation_statement: sanitizeString(onboardingPayload.motivation),
      is_verified: false,
      verification_code: verificationCode,
      verification_expires: verificationExpires,
    });
    await UserSetting.findOrCreate({
      where: { user_id: newUser.id },
      defaults: { ...defaultSettings, user_id: newUser.id },
    });

    try {
      await sendVerificationEmail(newUser.email, verificationCode);
    } catch (emailErr) {
      console.error("Failed to send verification email", emailErr);
    }

    res.status(201).json({
      message: "Verification code sent to email. Please verify to activate your account.",
      user: serializeUser({ ...newUser.get({ plain: true }), settings: await ensureUserSettings(newUser.id) }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
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

    if (!user.is_verified) {
      return res.status(403).json({ error: "Email not verified" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid password" });

    await ensureUserSettings(user.id);

    res.json({ message: "Login successful", user: serializeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Verify email
router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "email and code are required" });
    }

    const user = await User.findOne({ where: { email }, include: [{ model: UserSetting, as: "settings" }] });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.is_verified) {
      return res.json({ message: "Email already verified", user: serializeUser(user) });
    }

    if (
      !user.verification_code ||
      user.verification_code !== code ||
      (user.verification_expires && new Date(user.verification_expires) < new Date())
    ) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    user.is_verified = true;
    user.verification_code = null;
    user.verification_expires = null;
    await user.save();

    await ensureUserSettings(user.id);

    res.json({ message: "Email verified", user: serializeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to verify email" });
  }
});

// Resend verification code
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.is_verified) {
      return res.status(400).json({ error: "Email already verified" });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verification_code = verificationCode;
    user.verification_expires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    try {
      await sendVerificationEmail(user.email, verificationCode);
    } catch (emailErr) {
      console.error("Failed to send verification email", emailErr);
    }

    res.json({ message: "Verification code resent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to resend verification" });
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
