import express from "express";
import { Op } from "sequelize";
import {
  Notification,
  Schedule,
  Habit,
  Progress,
  UserSetting,
  User,
} from "../models/index.js";
import { habitLibraryBlueprint } from "../data/habitLibrary.js";
import { EmailConfigError, sendEmail } from "../utils/emailService.js";

const router = express.Router();

const serializeNotification = (notification) => {
  const payload = notification.get ? notification.get({ plain: true }) : notification;
  return {
    id: payload.id,
    userId: payload.user_id,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    category: payload.category,
    priority: payload.priority,
    metadata: payload.metadata || {},
    scheduledFor: payload.scheduled_for,
    createdAt: payload.created_at,
    isRead: Boolean(payload.is_read),
    readAt: payload.read_at,
    ctaLabel: payload.cta_label,
    ctaUrl: payload.cta_url,
  };
};

const computeSummary = (notifications) => {
  if (!notifications.length) {
    return {
      total: 0,
      unread: 0,
      upcoming: 0,
      categories: [],
      lastOpenedAt: null,
    };
  }

  const now = Date.now();
  const categoryCounts = notifications.reduce((acc, notification) => {
    const category = notification.category || "general";
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const lastOpened = notifications
    .filter((notification) => notification.read_at)
    .sort((a, b) => new Date(b.read_at) - new Date(a.read_at))[0]?.read_at;

  return {
    total: notifications.length,
    unread: notifications.filter((notification) => !notification.is_read).length,
    upcoming: notifications.filter((notification) => {
      if (!notification.scheduled_for) return false;
      return new Date(notification.scheduled_for).getTime() > now;
    }).length,
    categories: Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count })),
    lastOpenedAt: lastOpened || null,
  };
};

const combineDayAndTime = (day, time) => {
  if (!day) return null;
  const window = new Date(`${day}T${time || "00:00:00"}`);
  return Number.isNaN(window.getTime()) ? null : window;
};

router.get("/:userId/summary", async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const [notifications, settings] = await Promise.all([
      Notification.findAll({ where: { user_id: userId } }),
      UserSetting.findOne({ where: { user_id: userId } }),
    ]);

    res.json({
      summary: computeSummary(notifications),
      preferences: settings
        ? {
            email: settings.email_notifications,
            push: settings.push_notifications,
            timezone: settings.timezone,
          }
        : null,
    });
  } catch (error) {
    console.error("Failed to build notification summary", error);
    res.status(500).json({ error: "Failed to load notification summary" });
  }
});

router.patch("/:userId/read-all", async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const [updated] = await Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { user_id: userId, is_read: false } }
    );

    res.json({ updated });
  } catch (error) {
    console.error("Failed to mark all notifications read", error);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

router.patch("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    const isRead = Boolean(req.body.isRead ?? true);
    notification.is_read = isRead;
    notification.read_at = isRead ? new Date() : null;
    await notification.save();

    res.json({ notification: serializeNotification(notification) });
  } catch (error) {
    console.error("Failed to update notification", error);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

router.post("/:userId/refresh", async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const today = new Date();
    const twoDaysAhead = new Date();
    twoDaysAhead.setDate(today.getDate() + 2);

    const schedules = await Schedule.findAll({
      where: {
        user_id: userId,
        day: {
          [Op.between]: [
            today.toISOString().slice(0, 10),
            twoDaysAhead.toISOString().slice(0, 10),
          ],
        },
      },
      include: [{ model: Habit, as: "habit" }],
    });

    let createdOrUpdated = 0;
    for (const schedule of schedules) {
      const scheduledFor = combineDayAndTime(schedule.day, schedule.starttime);
      if (!scheduledFor || scheduledFor.getTime() < Date.now()) continue;

      const referenceId = `schedule-${schedule.id}`;
      const defaults = {
        user_id: userId,
        title: `${schedule.habit?.title || "Schedule"} reminder`,
        message: `Upcoming session on ${schedule.day} at ${schedule.starttime}.`,
        type: "schedule_reminder",
        category: "Schedule",
        priority: "medium",
        scheduled_for: scheduledFor,
        reference_id: referenceId,
        metadata: {
          scheduleId: schedule.id,
          repeat: schedule.repeat,
          customdays: schedule.customdays,
        },
        cta_label: "Review schedule",
        cta_url: "/schedules",
      };

      const [notification, created] = await Notification.findOrCreate({
        where: { user_id: userId, reference_id: referenceId },
        defaults,
      });

      if (!created) {
        await notification.update({
          scheduled_for: defaults.scheduled_for,
          message: defaults.message,
          metadata: defaults.metadata,
          title: defaults.title,
          is_read: notification.is_read && notification.read_at ? notification.is_read : false,
        });
      }

      createdOrUpdated += 1;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const recentProgress = await Progress.findAll({
      where: {
        user_id: userId,
        progress_date: { [Op.gte]: sevenDaysAgo.toISOString().slice(0, 10) },
      },
      include: [{ model: Habit, as: "habit" }],
    });

    const missesByHabit = recentProgress.reduce((acc, entry) => {
      if (!entry.habit) return acc;
      const key = entry.habit.id;
      if (!acc[key]) {
        acc[key] = {
          habit: entry.habit,
          missed: 0,
          completed: 0,
        };
      }
      if (entry.status === "completed") acc[key].completed += 1;
      if (entry.status === "missed") acc[key].missed += 1;
      return acc;
    }, {});

    const strugglingHabit = Object.values(missesByHabit)
      .filter((stat) => stat.missed >= stat.completed)
      .sort((a, b) => b.missed - a.missed)[0];

    if (strugglingHabit) {
      const referenceId = `progress-${strugglingHabit.habit.id}`;
      const suggestion = habitLibraryBlueprint.find(
        (habit) => habit.category === (strugglingHabit.habit.category || "")
      );
      await Notification.findOrCreate({
        where: { user_id: userId, reference_id: referenceId },
        defaults: {
          user_id: userId,
          title: `Give ${strugglingHabit.habit.title} a boost`,
          message:
            "You've missed this habit a few times lately. Try revisiting your schedule or pairing it with a smaller habit.",
          type: "progress_insight",
          category: "Progress",
          priority: "high",
          reference_id: referenceId,
          metadata: {
            habitId: strugglingHabit.habit.id,
            missed: strugglingHabit.missed,
            completed: strugglingHabit.completed,
            suggestedHabitId: suggestion?.id || null,
          },
          cta_label: "Adjust plan",
          cta_url: "/progress-tracker",
        },
      });
      createdOrUpdated += 1;
    }

    res.json({
      message: "Notifications refreshed",
      processed: createdOrUpdated,
    });
  } catch (error) {
    console.error("Failed to refresh notifications", error);
    res.status(500).json({ error: "Failed to refresh notifications" });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const filter = req.query.filter || "all";
    const categoryFilter = req.query.category || null;

    const notifications = await Notification.findAll({
      where: { user_id: userId },
      order: [
        ["is_read", "ASC"],
        ["scheduled_for", "ASC"],
        ["created_at", "DESC"],
      ],
    });

    let formatted = notifications.map(serializeNotification);

    if (filter === "unread") {
      formatted = formatted.filter((notification) => !notification.isRead);
    } else if (filter === "upcoming") {
      formatted = formatted.filter((notification) => {
        if (!notification.scheduledFor) return false;
        return new Date(notification.scheduledFor).getTime() > Date.now();
      });
    }

    if (categoryFilter) {
      formatted = formatted.filter(
        (notification) => notification.category === categoryFilter
      );
    }

    const summary = computeSummary(notifications.map((notification) => notification.get({ plain: true })));

    res.json({
      notifications: formatted,
      summary,
    });
  } catch (error) {
    console.error("Failed to fetch notifications", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      user_id,
      title,
      message,
      type,
      category,
      priority,
      scheduled_for,
      metadata,
      cta_label,
      cta_url,
    } = req.body;

    if (!user_id || !message) {
      return res.status(400).json({ error: "user_id and message are required" });
    }

    const notification = await Notification.create({
      user_id,
      title: title || "Custom reminder",
      message,
      type: type || "custom",
      category: category || "general",
      priority: priority || "medium",
      scheduled_for: scheduled_for ? new Date(scheduled_for) : null,
      metadata: metadata || {},
      cta_label: cta_label || null,
      cta_url: cta_url || null,
    });

    const [user, settings] = await Promise.all([
      User.findByPk(user_id, { attributes: ["name", "email"] }),
      UserSetting.findOne({ where: { user_id } }),
    ]);

    if (user?.email && settings?.email_notifications !== false) {
      const subject = `Reminder scheduled: ${notification.title || "Custom reminder"}`;
      const scheduleNote = notification.scheduled_for
        ? `Scheduled for ${new Date(notification.scheduled_for).toLocaleString()}`
        : "Scheduled for now";
      const greeting = user.name ? `Hi ${user.name},` : "Hi,";
      const text = `${greeting}\n\n${notification.message}\n\n${scheduleNote}\n\nYou set this reminder in your notifications center.`;

      try {
        await sendEmail({ to: user.email, subject, text });
      } catch (error) {
        if (error instanceof EmailConfigError) {
          console.warn("Email not sent: configuration missing for reminder", error.message);
        } else {
          console.error("Failed to dispatch reminder email", error);
        }
      }
    }

    res.status(201).json({ notification: serializeNotification(notification) });
  } catch (error) {
    console.error("Failed to create notification", error);
    res.status(500).json({ error: "Failed to create notification" });
  }
});

export default router;
