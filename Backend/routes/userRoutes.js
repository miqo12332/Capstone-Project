import express from "express";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import User from "../models/User.js";
import { UserSetting } from "../models/index.js";
import sequelize from "../sequelize.js";
import { sendVerificationEmail } from "../utils/email.js";
import asyncHandler from "../utils/asyncHandler.js";

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
  createdAt: user.createdAt || user.created_at,
  updatedAt: user.updatedAt || user.updated_at,
  settings: formatSettings(user.settings),
});

const ensureUserSettings = async (userId, transaction) => {
  const [settings] = await UserSetting.findOrCreate({
    where: { user_id: userId },
    defaults: { ...defaultSettings, user_id: userId },
    transaction,
  });
  return settings;
};

const generateVerification = () => ({
  code: Math.floor(100000 + Math.random() * 900000).toString(),
  expires: new Date(Date.now() + 15 * 60 * 1000),
});

const deliverVerification = async (user, code) => {
  try {
    await sendVerificationEmail(user.email, code);
  } catch (emailErr) {
    console.error("Failed to send verification email", emailErr);
  }
};

const router = express.Router();

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, email, password, onboarding = {} } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const verification = generateVerification();
    const onboardingPayload = {
      primaryGoal: onboarding.primaryGoal ?? req.body.primaryGoal ?? null,
      focusArea: onboarding.focusArea ?? req.body.focusArea ?? null,
      experienceLevel: onboarding.experienceLevel ?? req.body.experienceLevel ?? null,
      dailyCommitment: onboarding.dailyCommitment ?? req.body.dailyCommitment ?? null,
      supportPreference: onboarding.supportPreference ?? req.body.supportPreference ?? null,
      motivation: onboarding.motivation ?? req.body.motivation ?? null,
    };

    const newUser = await sequelize.transaction(async (transaction) => {
      const user = await User.create(
        {
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
          verification_code: verification.code,
          verification_expires: verification.expires,
        },
        { transaction }
      );

      await ensureUserSettings(user.id, transaction);
      return user;
    });

    await deliverVerification(newUser, verification.code);

    const userWithSettings = await User.findByPk(newUser.id, {
      include: [{ model: UserSetting, as: "settings" }],
    });

    try {
      await sendVerificationEmail(newUser.email, verificationCode);
    } catch (emailErr) {
      console.error("Failed to send verification email", emailErr);
    }

    res.status(201).json({
      message: "Verification code sent to email. Please verify to activate your account.",
      user: serializeUser(userWithSettings),
    });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
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
  })
);

router.post(
  "/verify-email",
  asyncHandler(async (req, res) => {
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

    const expired = user.verification_expires && new Date(user.verification_expires) < new Date();
    if (!user.verification_code || user.verification_code !== code || expired) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    user.is_verified = true;
    user.verification_code = null;
    user.verification_expires = null;
    await user.save();

    await ensureUserSettings(user.id);

    res.json({ message: "Email verified", user: serializeUser(user) });
  })
);

router.post(
  "/resend-verification",
  asyncHandler(async (req, res) => {
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

    const verification = generateVerification();
    await user.update({
      verification_code: verification.code,
      verification_expires: verification.expires,
    });

    await deliverVerification(user, verification.code);

    res.json({ message: "Verification code resent" });
  })
);

router.get(
  "/profile/:id",
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id, {
      include: [{ model: UserSetting, as: "settings" }],
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    await ensureUserSettings(user.id);

    res.json({ user: serializeUser(user) });
  })
);

router.put(
  "/profile/:id",
  asyncHandler(async (req, res) => {
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
  })
);

export default router;
