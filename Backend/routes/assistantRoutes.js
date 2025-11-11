import express from "express";
import { Op } from "sequelize";
import {
  User,
  Habit,
  Schedule,
  Progress,
  UserSetting,
  AssistantMemory,
} from "../models/index.js";

const router = express.Router();

const STOP_WORDS = new Set([
  "the",
  "a",
  "and",
  "or",
  "but",
  "with",
  "about",
  "for",
  "into",
  "how",
  "what",
  "is",
  "are",
  "to",
  "in",
  "of",
  "on",
  "i",
  "me",
  "my",
  "it",
  "can",
  "you",
  "we",
  "be",
  "need",
]);

const asPlain = (record) => (record ? record.get({ plain: true }) : null);

const ensureObject = (maybeJSON) => {
  if (!maybeJSON) return {};
  if (typeof maybeJSON === "string") {
    try {
      return JSON.parse(maybeJSON);
    } catch (err) {
      return {};
    }
  }
  return maybeJSON;
};

const extractKeywords = (message) => {
  if (!message) {
    return { list: [], counts: {} };
  }

  const counts = {};
  const list = [];
  const tokens = message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

  tokens.forEach((token) => {
    counts[token] = (counts[token] || 0) + 1;
    if (!list.includes(token)) {
      list.push(token);
    }
  });

  return { list, counts };
};

const buildUserSnapshot = async (userId) => {
  const userRecord = await User.findByPk(userId, {
    include: [{ model: UserSetting, as: "settings" }],
  });

  if (!userRecord) {
    throw new Error("User not found");
  }

  const [habitRecords, progressRecords, scheduleRecords] = await Promise.all([
    Habit.findAll({
      where: { user_id: userId },
      order: [["created_at", "ASC"]],
    }),
    Progress.findAll({
      where: { user_id: userId },
      order: [["progress_date", "DESC"]],
      limit: 90,
    }),
    Schedule.findAll({
      where: { userid: userId },
      order: [
        ["day", "ASC"],
        ["starttime", "ASC"],
      ],
      limit: 8,
      include: [{ model: Habit, as: "habit" }],
    }),
  ]);

  const habits = habitRecords.map(asPlain);
  const habitMap = new Map(habits.map((habit) => [habit.id, habit]));

  const progressStats = {
    completed: 0,
    missed: 0,
    skipped: 0,
    total: 0,
    completionRate: 0,
    habitSummaries: [],
    latestDate: null,
  };

  const habitSummaries = new Map();

  progressRecords.forEach((record) => {
    const log = record.get({ plain: true });
    progressStats.total += 1;
    if (log.status === "completed") progressStats.completed += 1;
    if (log.status === "missed") progressStats.missed += 1;
    if (log.status === "skipped") progressStats.skipped += 1;
    if (!progressStats.latestDate) {
      progressStats.latestDate = log.progress_date;
    }

    if (!habitSummaries.has(log.habit_id)) {
      const habit = habitMap.get(log.habit_id) || {};
      habitSummaries.set(log.habit_id, {
        habitId: log.habit_id,
        title: habit.title || "Untitled Habit",
        category: habit.category || "General",
        completed: 0,
        missed: 0,
        skipped: 0,
        total: 0,
        recentDates: new Set(),
      });
    }
    const summary = habitSummaries.get(log.habit_id);
    summary.total += 1;
    summary.recentDates.add(log.progress_date);
    if (log.status === "completed") summary.completed += 1;
    if (log.status === "missed") summary.missed += 1;
    if (log.status === "skipped") summary.skipped += 1;
  });

  progressStats.completionRate = progressStats.total
    ? Math.round((progressStats.completed / progressStats.total) * 100)
    : 0;

  const habitSummaryList = Array.from(habitSummaries.values()).map((summary) => {
    const completionRate = summary.total
      ? Math.round((summary.completed / summary.total) * 100)
      : 0;
    return {
      habitId: summary.habitId,
      title: summary.title,
      category: summary.category,
      completed: summary.completed,
      missed: summary.missed,
      skipped: summary.skipped,
      total: summary.total,
      completionRate,
      activeDays: summary.recentDates.size,
    };
  });

  habitSummaryList.sort((a, b) => b.completionRate - a.completionRate);
  progressStats.habitSummaries = habitSummaryList;

  const upcoming = scheduleRecords
    .map((record) => record.get({ plain: true }))
    .map((entry) => ({
      id: entry.id,
      habitId: entry.habit_id,
      habitTitle:
        (entry.habit && entry.habit.title) ||
        (habitMap.get(entry.habit_id) || {}).title ||
        "Personal Focus",
      day: entry.day,
      starttime: entry.starttime,
      endtime: entry.endtime,
      repeat: entry.repeat,
      notes: entry.notes,
    }));

  return {
    user: asPlain(userRecord),
    settings: asPlain(userRecord.settings),
    habits,
    progress: progressStats,
    schedules: { upcoming },
  };
};

const updateInsightMemory = async (userId, snapshot, keywordCounts) => {
  const existingInsight = await AssistantMemory.findOne({
    where: { user_id: userId, role: "insight" },
    order: [["created_at", "DESC"]],
  });

  const payload = ensureObject(existingInsight?.keywords);
  const aggregate = { ...(payload.keywordCounts || {}) };

  Object.entries(keywordCounts).forEach(([keyword, count]) => {
    aggregate[keyword] = (aggregate[keyword] || 0) + count;
  });

  const topKeywords = Object.entries(aggregate)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([keyword, count]) => ({ keyword, count }));

  const topHabits = snapshot.progress.habitSummaries.slice(0, 3);
  const needsHelp = snapshot.progress.habitSummaries
    .filter((summary) => summary.completionRate < 60)
    .slice(0, 3);

  const summaryLines = [
    `Primary goal: ${snapshot.user.primary_goal || "Set a goal to begin"}`,
    `Focus area: ${snapshot.user.focus_area || "Not specified"}`,
    `Daily commitment: ${snapshot.user.daily_commitment || "Flexible"}`,
    `Support style: ${snapshot.user.support_preference || "Open to guidance"}`,
    `Average completion: ${snapshot.progress.completionRate}% over ${snapshot.progress.total} recent actions`,
  ];

  if (topHabits.length) {
    summaryLines.push(
      `Top habits: ${topHabits
        .map((habit) => `${habit.title} (${habit.completionRate}% success)`)
        .join(", ")}`
    );
  }

  if (needsHelp.length) {
    summaryLines.push(
      `Habits needing love: ${needsHelp
        .map((habit) => `${habit.title} (${habit.completionRate}% success)`)
        .join(", ")}`
    );
  }

  if (topKeywords.length) {
    summaryLines.push(
      `Frequent interests: ${topKeywords
        .map((item) => `${item.keyword} (${item.count})`)
        .join(", ")}`
    );
  }

  const summaryText = summaryLines.join("\n");

  const newPayload = {
    keywordCounts: aggregate,
    generatedAt: new Date().toISOString(),
  };

  if (existingInsight) {
    existingInsight.content = summaryText;
    existingInsight.keywords = newPayload;
    existingInsight.created_at = new Date();
    await existingInsight.save();
  } else {
    await AssistantMemory.create({
      user_id: userId,
      role: "insight",
      content: summaryText,
      keywords: newPayload,
    });
  }

  return {
    summaryText,
    topKeywords,
    aggregate,
  };
};

const craftAssistantReply = (message, snapshot, keywordInsight) => {
  const firstName = snapshot.user.name?.split(" ")[0] || snapshot.user.name || "friend";
  const completionLine = snapshot.progress.total
    ? `You've completed ${snapshot.progress.completed} of ${snapshot.progress.total} recent check-ins (${snapshot.progress.completionRate}% success).`
    : "Let's start logging your first habit wins together!";

  const topHabit = snapshot.progress.habitSummaries[0];
  const needsAttention = snapshot.progress.habitSummaries
    .filter((habit) => habit.completionRate < 60)
    .slice(0, 2);
  const upcoming = snapshot.schedules.upcoming[0];

  const encouragement = needsAttention.length
    ? `Let's put a little extra focus on ${needsAttention
        .map((habit) => habit.title)
        .join(" and ")}. We'll build a small win around your next session.`
    : "Your habits are trending positively—keep nurturing that momentum!";

  const keywordNudge = keywordInsight.length
    ? `I hear you asking about ${keywordInsight
        .slice(0, 3)
        .map((item) => item.keyword)
        .join(", ")}. I'll keep tailoring tips around those themes.`
    : "Keep sharing what's on your mind so I can personalise every suggestion.";

  const scheduleLine = upcoming
    ? `Next on your schedule is **${upcoming.habitTitle}** on ${upcoming.day} at ${upcoming.starttime}. Do you want to adjust the plan or add a reminder?`
    : "Your calendar looks flexible—consider blocking a fresh window for a habit you want to prioritise.";

  const focusReminder = snapshot.user.primary_goal
    ? `Everything we do is steering you toward _${snapshot.user.primary_goal}_.`
    : "Set a primary goal in your profile so I can anchor recommendations around it.";

  const supportStyle = snapshot.user.support_preference
    ? `Since you prefer ${snapshot.user.support_preference.toLowerCase()} support, I'll keep the coaching in that tone.`
    : "Tell me your favourite support style and I'll adapt my coaching voice.";

  return [
    `Hey ${firstName}! ${completionLine}`,
    encouragement,
    scheduleLine,
    keywordNudge,
    focusReminder,
    supportStyle,
    "Ask me for ideas, quick reflections, or schedule help whenever you need a boost.",
  ].join("\n\n");
};

const mapHistory = (records) =>
  records.map((record) => ({
    id: record.id,
    role: record.role,
    content: record.content,
    createdAt: record.created_at,
    keywords: ensureObject(record.keywords),
  }));

router.get("/history", async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const snapshot = await buildUserSnapshot(userId);

    const [historyRecords, insightRecord] = await Promise.all([
      AssistantMemory.findAll({
        where: {
          user_id: userId,
          role: { [Op.in]: ["user", "assistant"] },
        },
        order: [["created_at", "ASC"]],
      }),
      AssistantMemory.findOne({
        where: { user_id: userId, role: "insight" },
        order: [["created_at", "DESC"]],
      }),
    ]);

    const insightPayload = ensureObject(insightRecord?.keywords);
    const keywordCounts = insightPayload.keywordCounts || {};
    const topKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([keyword, count]) => ({ keyword, count }));

    return res.json({
      history: mapHistory(historyRecords),
      summary: {
        profile: {
          name: snapshot.user.name,
          goal: snapshot.user.primary_goal,
          focusArea: snapshot.user.focus_area,
          commitment: snapshot.user.daily_commitment,
          supportPreference: snapshot.user.support_preference,
        },
        progress: snapshot.progress,
        topKeywords,
        upcoming: snapshot.schedules.upcoming,
        habits: snapshot.habits,
        insightText: insightRecord?.content || null,
      },
    });
  } catch (error) {
    console.error("Failed to load assistant history", error);
    return res.status(500).json({ error: "Failed to load assistant history" });
  }
});

router.post("/chat", async (req, res) => {
  const { userId, message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: "userId and message are required" });
  }

  try {
    const snapshot = await buildUserSnapshot(userId);
    const { counts } = extractKeywords(message);

    await AssistantMemory.create({
      user_id: userId,
      role: "user",
      content: message,
      keywords: { keywords: Object.keys(counts) },
    });

    const insight = await updateInsightMemory(userId, snapshot, counts);
    const reply = craftAssistantReply(message, snapshot, insight.topKeywords);

    await AssistantMemory.create({
      user_id: userId,
      role: "assistant",
      content: reply,
      keywords: { keywords: insight.topKeywords },
    });

    const historyRecords = await AssistantMemory.findAll({
      where: {
        user_id: userId,
        role: { [Op.in]: ["user", "assistant"] },
      },
      order: [["created_at", "ASC"]],
    });

    return res.json({
      reply,
      history: mapHistory(historyRecords),
      summary: {
        profile: {
          name: snapshot.user.name,
          goal: snapshot.user.primary_goal,
          focusArea: snapshot.user.focus_area,
          commitment: snapshot.user.daily_commitment,
          supportPreference: snapshot.user.support_preference,
        },
        progress: snapshot.progress,
        topKeywords: insight.topKeywords,
        upcoming: snapshot.schedules.upcoming,
        habits: snapshot.habits,
        insightText: insight.summaryText,
      },
    });
  } catch (error) {
    console.error("Assistant chat failed", error);
    return res.status(500).json({ error: "Assistant chat failed" });
  }
});

export default router;
