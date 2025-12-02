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

const getCoachStatus = () => ({
  ready: true,
  provider: "StepHabit Coach",
  model: "Insight Engine",
  reason: null,
  updatedAt: new Date().toISOString(),
});

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

const summarizeAboutText = (about, keywordCounts) => {
  if (!about) return "";

  const sentences = about
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const primary = sentences[0] || about.trim();

  const keywordLine = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([keyword]) => keyword)
    .join(", ");

  const baseSummary = primary.length > 180 ? `${primary.slice(0, 177)}…` : primary;
  const focusLine = keywordLine ? `Focus: ${keywordLine}.` : "";

  return [
    baseSummary.endsWith(".") || baseSummary.endsWith("!") || baseSummary.endsWith("?")
      ? baseSummary
      : `${baseSummary}.`,
    focusLine,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
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
      where: { user_id: userId },
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

const getLatestProfileMemory = async (userId) => {
  const record = await AssistantMemory.findOne({
    where: { user_id: userId, role: "profile" },
    order: [["created_at", "DESC"]],
  });

  if (!record) return null;

  const meta = ensureObject(record.keywords);

  return {
    summary: record.content,
    about: meta.about || null,
    keywords: meta.counts || meta.keywordCounts || {},
    updatedAt: record.created_at,
  };
};

const selectRandom = (choices, fallback) => {
  if (!Array.isArray(choices) || choices.length === 0) {
    return fallback;
  }
  return choices[Math.floor(Math.random() * choices.length)] || fallback;
};

const craftAssistantReply = ({ message, snapshot, keywordInsight = [], messageKeywords }) => {
  const firstName = snapshot.user.name?.split(" ")[0] || snapshot.user.name || "friend";
  const completionLine = snapshot.progress.total
    ? `You've completed ${snapshot.progress.completed} of ${snapshot.progress.total} recent check-ins (${snapshot.progress.completionRate}% success).`
    : "Let's start logging your first habit wins together!";

  const sortedMessageKeywords = Object.entries(messageKeywords || {})
    .sort((a, b) => b[1] - a[1])
    .map(([keyword]) => keyword);

  const focusKeyword = sortedMessageKeywords[0];
  const supportingKeyword = sortedMessageKeywords[1];

  const messageReflection = focusKeyword
    ? `It sounds like ${focusKeyword} has been on your mind${
        supportingKeyword ? `, along with ${supportingKeyword}` : ""
      }. Let's lean into that today.`
    : selectRandom(
        [
          "Thanks for sharing what's happening—I'm here to help you keep momentum.",
          "I appreciate you checking in. Let's shape this into a win.",
          "I'm glad you reached out; let's create a plan you feel good about.",
        ],
        "Thanks for the update—I'm ready to support you."
      );

  const needsAttention = snapshot.progress.habitSummaries
    .filter((habit) => habit.completionRate < 60)
    .slice(0, 2);
  const thrivingHabit = snapshot.progress.habitSummaries
    .filter((habit) => habit.completionRate >= 70)
    .slice(0, 1);
  const upcoming = snapshot.schedules.upcoming.slice(0, 2);

  const encouragement = needsAttention.length
    ? `We'll put extra focus on ${needsAttention
        .map((habit) => `**${habit.title}** (${habit.completionRate}% success)`) 
        .join(" and ")}. We'll shape your next session to feel lighter and more doable.`
    : thrivingHabit.length
    ? `I love how consistent you are with ${thrivingHabit
        .map((habit) => `**${habit.title}**`) 
        .join(", ")}. Let's use that energy as proof you can handle the tougher days.`
    : "Every log you make is a new data point we can build on—let's keep that streak growing.";

  const keywordNudge = keywordInsight.length
    ? `I'll keep weaving in ideas around ${keywordInsight
        .slice(0, 3)
        .map((item) => item.keyword)
        .join(", ")}. Feel free to tell me if you want to pivot.`
    : "Share any specific habit, obstacle, or schedule tweak you're curious about and I'll tailor the guidance.";

  const scheduleLines = upcoming.length
    ? upcoming.map((item) => `• **${item.habitTitle}** on ${item.day} at ${item.starttime}${
        item.endtime ? ` → ${item.endtime}` : ""
      }`).join("\n")
    : "• Your calendar looks flexible—want me to suggest a time block for a key habit?";

  const focusReminder = snapshot.user.primary_goal
    ? `Everything we're mapping out connects back to _${snapshot.user.primary_goal}_.`
    : "Consider setting a primary goal in your profile so I can anchor recommendations around it.";

  const supportStyle = snapshot.user.support_preference
    ? `I'll keep the tone ${snapshot.user.support_preference.toLowerCase()} just like you prefer.`
    : "Tell me how you like to be coached—gentle nudges, accountability, brainstorms—and I'll adapt instantly.";

  const closingPrompt = selectRandom(
    [
      "What tiny win would feel amazing by the end of today?",
      "Want to walk through a quick plan together or explore motivation techniques?",
      "What feels like the next best step we can commit to right now?",
      "Shall we review your progress logs to see what patterns we can use to your advantage?",
    ],
    "What should we tackle together next?"
  );

  const actionableIdeas = [];

  if (needsAttention.length) {
    actionableIdeas.push(
      `Try a 5-minute starter for ${needsAttention[0].title} and log how it felt—small reps build confidence.`
    );
  }

  if (thrivingHabit.length) {
    actionableIdeas.push(
      `Celebrate your wins with ${thrivingHabit[0].title}; reinforcing success keeps motivation high.`
    );
  }

  if (!needsAttention.length && !thrivingHabit.length) {
    actionableIdeas.push("Pick one habit today and visualise finishing it—then set a reminder so it actually happens.");
  }

  if (upcoming.length) {
    actionableIdeas.push(
      `Preview your next session${upcoming.length > 1 ? "s" : ""} above and decide what would make it feel easier.`
    );
  }

  return [
    `Hey ${firstName}! ${completionLine}`,
    messageReflection,
    encouragement,
    keywordNudge,
    "Here's what your upcoming plan looks like:\n" + scheduleLines,
    focusReminder,
    supportStyle,
    "Try one of these ideas next:",
    actionableIdeas.map((idea) => `• ${idea}`).join("\n"),
    closingPrompt,
  ]
    .filter(Boolean)
    .join("\n\n");
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

    const [historyRecords, insightRecord, profileMemory] = await Promise.all([
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
      getLatestProfileMemory(userId),
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
        profileMemory,
      },
      agent: getCoachStatus(),
    });
  } catch (error) {
    console.error("Failed to load assistant history", error);
    return res.status(500).json({ error: "Failed to load assistant history" });
  }
});

router.get("/profile", async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const profile = await getLatestProfileMemory(userId);
    return res.json(profile || { summary: null, about: null, keywords: {}, updatedAt: null });
  } catch (error) {
    console.error("Failed to load assistant profile memory", error);
    return res.status(500).json({ error: "Failed to load assistant profile" });
  }
});

router.post("/profile", async (req, res) => {
  const { userId, about } = req.body;

  if (!userId || !about) {
    return res.status(400).json({ error: "userId and about are required" });
  }

  try {
    const { counts } = extractKeywords(about);
    const summary = summarizeAboutText(about, counts);

    const record = await AssistantMemory.create({
      user_id: userId,
      role: "profile",
      content: summary,
      keywords: {
        about,
        counts,
        generatedAt: new Date().toISOString(),
      },
    });

    return res.json({
      summary,
      about,
      keywords: counts,
      updatedAt: record.created_at,
    });
  } catch (error) {
    console.error("Failed to store assistant profile", error);
    return res.status(500).json({ error: "Failed to store assistant profile" });
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
      keywords: { keywords: Object.keys(counts), counts },
    });

    const insight = await updateInsightMemory(userId, snapshot, counts);

    const agentMeta = getCoachStatus();

    const reply = craftAssistantReply({
      message,
      snapshot,
      keywordInsight: insight.topKeywords,
      messageKeywords: counts,
    });

    await AssistantMemory.create({
      user_id: userId,
      role: "assistant",
      content: reply,
      keywords: {
        keywords: insight.topKeywords,
        messageKeywords: counts,
        agent: agentMeta,
      },
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
      agent: agentMeta,
    });
  } catch (error) {
    console.error("Assistant chat failed", error);
    return res.status(500).json({ error: "Assistant chat failed" });
  }
});

export default router;
