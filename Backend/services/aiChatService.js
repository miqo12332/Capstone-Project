import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { Op, QueryTypes } from "sequelize";

import sequelize from "../sequelize.js";
import { buildHabitSuggestion, detectConfirmation, detectHabitIdea } from "../utils/habitNlp.js";
import {
  Achievement,
  CalendarEvent,
  Friend,
  GroupChallenge,
  Habit,
  Notification,
  Progress,
  BusySchedule,
  Schedule,
  Task,
  User,
  UserSetting,
} from "../models/index.js";
import { findPendingHabitSuggestion, getChatHistory } from "./memoryService.js";

const CLAUDE_BASE_URL = (process.env.CLAUDE_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20240620";
const FALLBACK_CLAUDE_MODEL = process.env.CLAUDE_FALLBACK_MODEL || "claude-3-haiku-20240307";
const MESSAGE_HISTORY_LIMIT = 12;

const parseIntOrNull = (value) => {
  if (value == null) return null;
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const resolveApiKey = () =>
  process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY || null;

const normalizeTableName = (entry) => {
  if (!entry) return "unknown";
  if (typeof entry === "string") return entry;
  return entry.tableName || entry.table_name || "unknown";
};

const describeTables = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const rawTables = await queryInterface.showAllTables();
  const tableNames = rawTables.map(normalizeTableName);

  const definitions = [];

  for (const name of tableNames) {
    try {
      const columns = await queryInterface.describeTable(name);
      const rows = await sequelize.query(`SELECT COUNT(*) as count FROM ${name};`, {
        type: QueryTypes.SELECT,
      });

      definitions.push({
        name,
        rowCount: parseInt(rows?.[0]?.count, 10) || 0,
        columns: Object.entries(columns || {}).map(([columnName, detail]) => ({
          name: columnName,
          type: detail?.type || "unknown",
          allowNull: Boolean(detail?.allowNull),
        })),
      });
    } catch (error) {
      console.error("Failed to describe table", name, error);
    }
  }

  return definitions;
};

const mapHabit = (habit) => {
  const progressLogs = habit.progressLogs || [];
  const recentNotes = progressLogs
    .map((log) => ({
      id: log.id,
      date: log.progress_date || log.created_at,
      status: log.status,
      note: log.reflected_reason ?? log.reflection_reason,
    }))
    .filter((log) => log.note)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 5);

  return {
    id: habit.id,
    title: habit.title,
    category: habit.category,
    goal: habit.goal,
    progressLogs: progressLogs.length,
    recentNotes,
    schedules: (habit.schedules || []).map((s) => ({
      id: s.id,
      day: s.day,
      starttime: s.starttime,
      endtime: s.endtime,
    })),
  };
};

const buildRecentNotesDigest = (habits = []) => {
  const sections = [];

  for (const habit of habits) {
    const notes = habit.recentNotes || [];
    if (!notes.length) continue;

    const entries = notes
      .map((note) => {
        const statusLabel = note.status ? `(${note.status})` : "";
        const dateLabel = note.date ? ` ${note.date}` : "";
        return `${statusLabel}${dateLabel}: ${note.note}`;
      })
      .join("; ");

    sections.push(`${habit.title || "Habit"}: ${entries}`);
  }

  return sections.length ? sections.join("\n") : "No recent habit notes recorded.";
};

const normalizeReasonText = (text) =>
  (text || "")
    .replace(/\s+/g, " ")
    .replace(/[\n\r]+/g, " ")
    .trim();

const loadReflectionInsights = async (userId) => {
  if (!userId) return null;

  const reflections = await Progress.findAll({
    where: {
      user_id: userId,
      reflected_reason: { [Op.ne]: null },
    },
    include: [{ model: Habit, as: "habit", attributes: ["title"] }],
    order: [
      ["progress_date", "DESC"],
      ["created_at", "DESC"],
      ["id", "DESC"],
    ],
    limit: 200,
  });

  if (!reflections.length) return null;

  const statusCounts = {};
  const reasonMap = new Map();
  const recent = [];

  reflections.forEach((entry) => {
    const progress = entry.get({ plain: true });
    const status = progress.status?.toLowerCase();
    const reason = normalizeReasonText(progress.reflected_reason || progress.reflection_reason);

    if (status) {
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    if (reason) {
      const existing = reasonMap.get(reason) || { reason, count: 0, statuses: {} };
      existing.count += 1;
      if (status) existing.statuses[status] = (existing.statuses[status] || 0) + 1;
      reasonMap.set(reason, existing);
    }

    if (recent.length < 8 && reason) {
      recent.push({
        reason,
        status,
        habit: progress.habit?.title || null,
        date: progress.progress_date || progress.created_at || null,
      });
    }
  });

  const topReasons = Array.from(reasonMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { statusCounts, topReasons, recent };
};

const formatReflectionInsights = (insights) => {
  if (!insights) return "No reflection notes found yet.";

  const statusLine = Object.keys(insights.statusCounts || {}).length
    ? `Status mix: ${Object.entries(insights.statusCounts)
        .map(([status, count]) => `${status}: ${count}`)
        .join(", ")}.`
    : "Status mix: no progress logged yet.";

  const reasonsLine = (insights.topReasons || []).length
    ? (insights.topReasons || [])
        .map((entry, idx) => {
          const statuses = Object.keys(entry.statuses || {}).length
            ? ` (${Object.entries(entry.statuses)
                .map(([status, count]) => `${status}:${count}`)
                .join(", ")})`
            : "";
          return `${idx + 1}. "${entry.reason}" noted ${entry.count} time${
            entry.count === 1 ? "" : "s"
          }${statuses}`;
        })
        .join("; ")
    : "No repeating reasons captured yet.";

  const recentLine = (insights.recent || []).length
    ? insights.recent
        .map((entry) => {
          const habit = entry.habit ? `for ${entry.habit}` : "";
          const status = entry.status ? ` (${entry.status})` : "";
          const date = entry.date ? ` on ${entry.date}` : "";
          return `${entry.reason}${habit}${status}${date}`;
        })
        .join("; ")
    : "No recent reflections found.";

  return [statusLine, `Common reasons: ${reasonsLine}`, `Recent reflections: ${recentLine}`].join("\n");
};

const mapTask = (task) => ({
  id: task.id,
  name: task.name,
  status: task.status,
  due_date: task.due_date,
  duration_minutes: task.duration_minutes,
  min_duration_minutes: task.min_duration_minutes,
  max_duration_minutes: task.max_duration_minutes,
  split_up: task.split_up,
  schedule_after: task.schedule_after,
  color: task.color,
});

const loadUserContext = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [
      { model: Habit, as: "habits", include: [{ model: Schedule, as: "schedules" }, { model: Progress, as: "progressLogs" }] },
      { model: Notification, as: "notifications" },
      { model: Achievement, as: "achievements" },
      { model: UserSetting, as: "settings" },
      { model: CalendarEvent, as: "calendarEvents" },
      { model: BusySchedule, as: "busySchedules" },
      { model: Task, as: "tasks" },
      {
        model: User,
        as: "friends",
        through: { model: Friend, attributes: ["status", "created_at", "share_habits"] },
      },
      { model: GroupChallenge, as: "groupChallenges" },
    ],
  });

  if (!user) return null;

  const plain = user.get({ plain: true });

  return {
    profile: {
      id: plain.id,
      name: plain.name,
      email: plain.email,
      primary_goal: plain.primary_goal,
      focus_area: plain.focus_area,
      daily_commitment: plain.daily_commitment,
      support_preference: plain.support_preference,
    },
    habits: (plain.habits || []).map(mapHabit),
    notifications: (plain.notifications || []).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      scheduled_for: n.scheduled_for,
    })),
    achievements: (plain.achievements || []).map((a) => ({ id: a.id, name: a.name })),
    settings: plain.settings || null,
    tasks: (plain.tasks || []).map(mapTask),
    calendarEvents: (plain.calendarEvents || []).map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
    })),
    busySchedules: (plain.busySchedules || []).map((entry) => ({
      id: entry.id,
      title: entry.title,
      day: entry.day,
      starttime: entry.starttime,
      endtime: entry.endtime,
    })),
    friends: (plain.friends || []).map((friend) => ({
      id: friend.id,
      name: friend.name,
      email: friend.email,
      status: friend.Friend?.status || null,
      connected_since: friend.Friend?.created_at || null,
      share_habits: friend.Friend?.share_habits ?? null,
    })),
    groupChallenges: (plain.groupChallenges || []).map((challenge) => ({
      id: challenge.id,
      name: challenge.name,
      description: challenge.description,
    })),
  };
};

const formatTableSummary = (tables) =>
  tables
    .map((table) => {
      const columns = table.columns.map((c) => `${c.name} (${c.type})`).join(", ");
      return `${table.name} [${table.rowCount} rows]: ${columns}`;
    })
    .join("\n");

const analyzeHabitIntent = (message, history = []) => {
  const normalized = (message || "").trim();
  const lower = normalized.toLowerCase();
  const pendingSuggestion = findPendingHabitSuggestion(history);

  const reflectionQuery =
    /\bwhy\b/.test(lower) ||
    /\breason\b/.test(lower) ||
    /\bstruggl/.test(lower) ||
    /\bfail/.test(lower) ||
    /\bmiss/.test(lower) ||
    /\bskip/.test(lower);

  if (!normalized) {
    return { intent: "chat", habitSuggestion: null, reply: null };
  }

  if (reflectionQuery) {
    return { intent: "chat", habitSuggestion: null, reply: null };
  }

  if (detectConfirmation(lower) && pendingSuggestion) {
    return {
      intent: "confirm-add",
      habitSuggestion: pendingSuggestion,
      reply: null,
    };
  }

  if (detectHabitIdea(lower)) {
    return {
      intent: "suggest",
      habitSuggestion: null,
      reply: null,
    };
  }

  return { intent: "chat", habitSuggestion: null, reply: null };
};

const toChatMessage = (entry) => {
  if (!entry?.content) return null;
  return entry.role === "assistant"
    ? new AIMessage(entry.content)
    : new HumanMessage(entry.content);
};

const summarizeRecentTopics = (history) => {
  const userMessages = (history || [])
    .filter((entry) => entry.role === "user")
    .map((entry) => entry.content);

  if (!userMessages.length) return null;

  const lastTwo = userMessages.slice(-2);
  return lastTwo.join(" | ");
};

const fallbackReply = ({ message, userContext, dbOverview, history }) => {
  const habits = userContext?.habits || [];
  const habitTitles = habits.map((h) => h.title).filter(Boolean);
  const primaryGoal = userContext?.profile?.primary_goal || "your goals";
  const tablesMention = dbOverview?.length ? dbOverview.map((t) => t.name).join(", ") : "the database";
  const recentTopics = summarizeRecentTopics(history);

  const habitLine = habitTitles.length
    ? `I'm tracking ${habitTitles.length} of your habits, like ${habitTitles.slice(0, 3).join(", ")}.`
    : "I don't see any saved habits yet, but I can help you plan the first one.";

  const topicLine = recentTopics
    ? `You recently asked about ${recentTopics}.`
    : "We can start fresh—tell me what's on your mind.";

  return [
    `Got it: "${message}". Here's how I can help while we chat naturally:`,
    habitLine,
    `I'm aware of tables such as ${tablesMention} and your primary goal is ${primaryGoal}.`,
    topicLine,
    "What would you like to explore next?",
  ].join(" ");
};

const buildChatMessages = ({ systemInstruction, history, message }) => {
  const conversation = (history || [])
    .filter((entry) => ["user", "assistant"].includes(entry.role))
    .slice(-MESSAGE_HISTORY_LIMIT)
    .map(toChatMessage)
    .filter(Boolean);

  if (message && (!history?.length || history[history.length - 1]?.role !== "user")) {
    conversation.push(new HumanMessage(message));
  }

  return [new SystemMessage(systemInstruction), ...conversation];
};

const buildConversationMessages = (history) =>
  (history || [])
    .filter((entry) => ["user", "assistant"].includes(entry.role))
    .slice(-MESSAGE_HISTORY_LIMIT)
    .map(toChatMessage)
    .filter(Boolean);

const parseProgressDecision = (raw) => {
  if (!raw) return null;

  try {
    const cleaned = raw.trim().replace(/```(json)?/g, "");
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    const target = jsonStart >= 0 && jsonEnd >= 0 ? cleaned.slice(jsonStart, jsonEnd + 1) : cleaned;
    const parsed = JSON.parse(target);

    if (parsed.action !== "log-progress") return null;

    const habitId = Number.parseInt(parsed.habitId, 10);
    const status = ["done", "missed"].includes(parsed.status) ? parsed.status : null;

    if (!habitId || !status) return null;

    return {
      habitId,
      status,
      note: parsed.note?.trim() || null,
      userReply: parsed.userReply?.trim() || null,
    };
  } catch (error) {
    console.error("Failed to parse progress decision", error?.message || error);
    return null;
  }
};

const requestClaudeProgressDecision = async ({ message, userContext, history }) => {
  const habits = userContext?.habits || [];
  if (!habits.length) return null;

  const habitSummaries = habits.map((h) => ({
    id: h.id,
    title: h.title,
    goal: h.goal || null,
    targetReps: h.targetReps || null,
    recentNotes: (h.recentNotes || []).map((note) => ({
      date: note.date,
      status: note.status,
      note: note.note,
    })),
  }));

  const systemInstruction = [
    "You are Claude, the StepHabit AI coach that can log progress.",
    "If the user reports doing or missing a habit, choose the best matching habitId from the provided list and decide status",
    "based on whether they met the goal/target reps. Partial or below-goal updates should be treated as missed with a warm",
    "note acknowledging effort.",
    "Respond ONLY with JSON in the shape: { action: 'log-progress', habitId: number, status: 'done' | 'missed', note: str",
    "ing | null, userReply: string }. The userReply should be a friendly one-sentence acknowledgment that you generated.",
    "Use the note field to briefly capture what happened (e.g., partial completion) in natural language. Do not include mark",
    "down.",
    "Each habit includes recentNotes so you can append new reflections or reference past ones when logging progress.",
    `Known habits: ${JSON.stringify(habitSummaries)}`,
  ].join("\n");

  const conversation = buildConversationMessages(history);
  const prompt = new HumanMessage(
    [
      "Decide if this message should log progress for a known habit. If it doesn't match, respond with { action: 'none' }.",
      `User message: ${message}`,
    ].join("\n")
  );

  const reply = await callClaude([new SystemMessage(systemInstruction), ...conversation, prompt]);
  return parseProgressDecision(reply);
};

const callClaude = async (messages) => {
  const apiKey = resolveApiKey();
  if (!apiKey) return null;

  const modelsToTry = [CLAUDE_MODEL, FALLBACK_CLAUDE_MODEL].filter(Boolean);

  for (const model of modelsToTry) {
    try {
      const chat = new ChatAnthropic({
        apiKey,
        baseURL: CLAUDE_BASE_URL,
        model,
        temperature: 0.4,
        maxTokens: 800,
      });

      const result = await chat.invoke(messages);
      const reply =
        typeof result?.content === "string"
          ? result.content.trim()
          : result?.content?.map?.((c) => c.text).filter(Boolean).join("\n").trim();

      return reply || null;
    } catch (error) {
      const notFound =
        error?.lc_error_code === "MODEL_NOT_FOUND" ||
        error?.status === 404 ||
        error?.error?.error?.type === "not_found_error";

      console.error("AI chat model failed", model, error?.message || error);
      if (!notFound) throw error;
    }
  }

  return null;
};

const parseHabitJson = (raw) => {
  if (!raw) return null;

  try {
    const cleaned = raw.trim().replace(/```(json)?/g, "");
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    const target = jsonStart >= 0 && jsonEnd >= 0 ? cleaned.slice(jsonStart, jsonEnd + 1) : cleaned;
    const parsed = JSON.parse(target);

    if (!parsed.title || !parsed.description) return null;

    return {
      title: parsed.title,
      description: parsed.description,
      category: parsed.category || "General",
      isDailyGoal: parsed.isDailyGoal !== false,
      targetReps: parsed.targetReps ?? null,
      summary: parsed.summary || `${parsed.title} — ${parsed.description}`,
    };
  } catch (error) {
    console.error("Failed to parse habit JSON", error?.message || error);
    return null;
  }
};

const requestClaudeHabitSuggestion = async ({ message, userContext }) => {
  const systemInstruction = [
    "You are Claude, an encouraging habit coach.",
    "Given a user's request, propose a single, realistic starter habit using their context.",
    "Respond ONLY with compact JSON using keys: title (short habit name), description (one sentence with when/how long), category (broad area), isDailyGoal (boolean), targetReps (integer or null), summary (friendly one-line pitch).",
    "Keep defaults gentle (e.g., 10 minutes a day) and avoid markdown.",
    `User context: ${JSON.stringify(userContext || {})}`,
  ].join("\n");

  const messages = [new SystemMessage(systemInstruction), new HumanMessage(message)];
  const reply = await callClaude(messages);
  return parseHabitJson(reply);
};

const parseScheduleJson = (raw) => {
  if (!raw) return null;

  try {
    const cleaned = raw.trim().replace(/```(json)?/g, "");
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    const target = jsonStart >= 0 && jsonEnd >= 0 ? cleaned.slice(jsonStart, jsonEnd + 1) : cleaned;
    const parsed = JSON.parse(target);

    if (parsed.action === "habit") {
      return { action: "habit" };
    }

    if (parsed.action === "clarify-event" || parsed.action === "clarify-task" || parsed.action === "clarify") {
      const question = parsed.question?.trim();
      const target = parsed.target?.trim() || (parsed.action === "clarify-task" ? "task" : parsed.action === "clarify-event" ? "event" : null);
      return question ? { action: "clarify", question, target: target || null } : null;
    }

    if (parsed.action === "create-task") {
      const name = parsed.name?.trim() || parsed.title?.trim();
      if (!name) return null;

      const status = (parsed.status?.trim() || "pending").toLowerCase();
      const allowedStatuses = new Set(["pending", "done", "missed"]);

      return {
        action: "create-task",
        name,
        dueDate: parsed.dueDate?.trim() || null,
        scheduleAfter: parsed.scheduleAfter?.trim() || null,
        durationMinutes: parseIntOrNull(parsed.durationMinutes) ?? 60,
        minDuration: parseIntOrNull(parsed.minDuration),
        maxDuration: parseIntOrNull(parsed.maxDuration),
        splitUp: parsed.splitUp === undefined ? false : Boolean(parsed.splitUp),
        hoursLabel: parsed.hoursLabel?.trim() || null,
        color: parsed.color?.trim() || null,
        status: allowedStatuses.has(status) ? status : "pending",
        userReply: parsed.userReply?.trim() || null,
      };
    }

    if (parsed.action === "create-reminder") {
      const title = parsed.title?.trim();
      const day = parsed.day?.trim();
      const starttime = parsed.starttime?.trim() || parsed.eventTime?.trim() || null;
      const remindtime = parsed.remindtime?.trim() || parsed.reminderTime?.trim() || null;

      if (!title || !day || (!remindtime && !starttime)) return null;

      return {
        action: "create-reminder",
        title,
        message: parsed.message?.trim() || null,
        day,
        starttime,
        remindtime,
        leadMinutes: parseIntOrNull(parsed.leadMinutes ?? parsed.minutesBefore ?? parsed.remindBefore),
        category: parsed.category?.trim() || "Reminder",
        priority: parsed.priority?.trim() || "medium",
        type: parsed.type?.trim() || "assistant_reminder",
        mode: parsed.mode?.trim() || null,
        location: parsed.location?.trim() || null,
        travelMinutes: parseIntOrNull(parsed.travelMinutes),
        reason: parsed.reason?.trim() || null,
        userReply: parsed.userReply?.trim() || null,
      };
    }

    if (parsed.action === "delete-event") {
      const id = Number.parseInt(parsed.id, 10);
      const title = parsed.title?.trim() || null;
      const day = parsed.day?.trim() || null;
      const starttime = parsed.starttime?.trim() || null;

      if (!Number.isFinite(id) && !title && !day && !starttime) return null;

      return {
        action: "delete-event",
        id: Number.isFinite(id) ? id : null,
        title,
        day,
        starttime,
        userReply: parsed.userReply?.trim() || null,
      };
    }

    if (parsed.action === "delete-reminder") {
      const id = Number.parseInt(parsed.id, 10);
      const title = parsed.title?.trim() || null;
      const day = parsed.day?.trim() || null;
      const starttime = parsed.starttime?.trim() || null;

      if (!Number.isFinite(id) && !title && !day && !starttime) return null;

      return {
        action: "delete-reminder",
        id: Number.isFinite(id) ? id : null,
        title,
        day,
        starttime,
        userReply: parsed.userReply?.trim() || null,
      };
    }

    if (parsed.action !== "create-event") return null;

    const title = parsed.title?.trim();
    const day = parsed.day?.trim();
    const starttime = parsed.starttime?.trim();

    if (!title || !day || !starttime) return null;

    return {
      action: "create-event",
      title,
      day,
      starttime,
      endtime: parsed.endtime?.trim() || null,
      enddate: parsed.enddate?.trim() || null,
      repeat: parsed.repeat?.trim() || "once",
      customdays: parsed.customdays?.trim() || null,
      notes: parsed.notes?.trim() || null,
      userReply: parsed.userReply?.trim() || null,
    };
  } catch (error) {
    console.error("Failed to parse schedule JSON", error?.message || error);
    return null;
  }
};

const getReferenceDateInfo = (userContext) => {
  const timezone = userContext?.settings?.timezone || "UTC";

  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date())
      .reduce((acc, part) => {
        if (part.type !== "literal") acc[part.type] = part.value;
        return acc;
      }, {});

    const currentDate = `${parts.year}-${parts.month}-${parts.day}`;
    const currentTime = `${parts.hour}:${parts.minute}`;

    return {
      timezone,
      currentDate,
      currentTime,
    };
  } catch (error) {
    console.error("Failed to derive reference date info", error?.message || error);
    return {
      timezone,
      currentDate: new Date().toISOString().slice(0, 10),
      currentTime: null,
    };
  }
};

const DEFAULT_EVENT_DURATION_MINUTES = 60;

const parseTimeToMinutes = (timeString) => {
  if (!timeString || typeof timeString !== "string") return null;
  const [hoursStr, minutesStr] = timeString.split(":");
  const hours = Number.parseInt(hoursStr, 10);
  const minutes = Number.parseInt(minutesStr, 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const minutesToTime = (totalMinutes) => {
  if (typeof totalMinutes !== "number" || Number.isNaN(totalMinutes)) return null;
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60) % 24;
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const isReminderNotification = (notification) => {
  const type = (notification?.type || "").toLowerCase();
  const category = (notification?.category || "").toLowerCase();
  return type === "custom" || type.includes("reminder") || category === "reminder";
};

const normalizeTitle = (value) => (value || "").trim().toLowerCase();

const deriveReminderSchedule = (notification) => {
  if (!notification?.scheduled_for) return { day: null, time: null };

  const scheduled = new Date(notification.scheduled_for);
  if (Number.isNaN(scheduled.getTime())) return { day: null, time: null };

  return {
    day: scheduled.toISOString().slice(0, 10),
    time: scheduled.toISOString().slice(11, 16),
  };
};

const findReminderForDeletion = async ({ userId, decision }) => {
  const reminders = await Notification.findAll({ where: { user_id: userId } });
  const reminderPool = reminders.filter(isReminderNotification);

  if (!reminderPool.length) return null;

  if (decision.id) {
    const byId = reminderPool.find((entry) => entry.id === decision.id);
    if (byId) return byId;
  }

  const normalizedTitle = normalizeTitle(decision.title);
  const filtered = reminderPool.filter((entry) => {
    const matchesTitle = normalizedTitle ? normalizeTitle(entry.title) === normalizedTitle : true;
    if (!matchesTitle) return false;

    const schedule = deriveReminderSchedule(entry.get ? entry.get({ plain: true }) : entry);
    const matchesDay = decision.day ? schedule.day === decision.day : true;
    const matchesTime = decision.starttime ? schedule.time === decision.starttime : true;

    return matchesDay && matchesTime;
  });

  return filtered[0] || null;
};

const ensureTimeWithSeconds = (timeString) => {
  if (!timeString || typeof timeString !== "string") return null;
  if (!timeString.includes(":")) return `${timeString}:00`;
  return timeString.length === 5 ? `${timeString}:00` : timeString;
};

const combineDayAndTime = (day, timeString) => {
  if (!day || !timeString) return null;
  const normalized = ensureTimeWithSeconds(timeString);
  if (!normalized) return null;

  const date = new Date(`${day}T${normalized}`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const deriveReminderDate = ({ day, starttime, remindtime, leadMinutes }) => {
  const explicitReminder = remindtime ? combineDayAndTime(day, remindtime) : null;
  if (explicitReminder) return explicitReminder;

  const eventDate = starttime ? combineDayAndTime(day, starttime) : null;
  if (!eventDate || leadMinutes == null) return null;

  const minutes = Number(leadMinutes);
  if (!Number.isFinite(minutes)) return null;

  return new Date(eventDate.getTime() - minutes * 60000);
};

const formatDateLabel = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "the scheduled time";
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} at ${iso.slice(11, 16)}`;
};

const parseCustomDays = (customdays) => {
  if (!customdays || typeof customdays !== "string") return new Set();

  const map = {
    sun: 0,
    sunday: 0,
    mon: 1,
    monday: 1,
    tue: 2,
    tues: 2,
    tuesday: 2,
    wed: 3,
    weds: 3,
    wednesday: 3,
    thu: 4,
    thur: 4,
    thurs: 4,
    thursday: 4,
    fri: 5,
    friday: 5,
    sat: 6,
    saturday: 6,
  };

  return customdays
    .split(/[^a-zA-Z]+/)
    .map((token) => map[token.toLowerCase()])
    .filter((val) => val != null)
    .reduce((set, val) => set.add(val), new Set());
};

const buildRecurrenceDays = ({ day, repeat = "once", enddate, customdays }) => {
  if (!day) return [];

  const occurrences = [];
  const start = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return occurrences;

  const end = (() => {
    if (!enddate) return new Date(start);
    const parsed = new Date(`${enddate}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return new Date(start);
    return parsed;
  })();

  const limit = 180; // safety guard for long ranges
  const addOccurrence = (dateObj) => {
    if (occurrences.length >= limit) return;
    occurrences.push(dateObj.toISOString().split("T")[0]);
  };

  const normalizedRepeat = (repeat || "once").toLowerCase();

  if (normalizedRepeat === "once") {
    addOccurrence(start);
    return occurrences;
  }

  const targetDays = parseCustomDays(customdays);
  const defaultDay = start.getUTCDay();
  const weekdaySet = targetDays.size ? targetDays : new Set([defaultDay]);

  for (
    const cursor = new Date(start);
    cursor <= end && occurrences.length < limit;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    if (normalizedRepeat === "daily") {
      addOccurrence(cursor);
    } else if (normalizedRepeat === "weekly" || normalizedRepeat === "custom") {
      if (weekdaySet.has(cursor.getUTCDay())) {
        addOccurrence(cursor);
      }
    }
  }

  if (!occurrences.length) addOccurrence(start);
  return occurrences;
};

const normalizeInterval = ({ start, end, day, title, type }) => {
  if (start == null) return null;
  const safeEnd = end && end > start ? end : start + DEFAULT_EVENT_DURATION_MINUTES;
  return {
    start,
    end: safeEnd,
    day,
    title: title || "Busy", 
    type: type || "schedule",
  };
};

const collectExistingDayBlocks = async ({ userId, day }) => {
  if (!userId || !day) return [];

  const dayStart = new Date(`${day}T00:00:00Z`);
  const nextDay = new Date(dayStart);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const [busySchedules, habitSchedules, calendarEvents] = await Promise.all([
    BusySchedule.findAll({ where: { user_id: userId, day } }),
    Schedule.findAll({
      where: { user_id: userId, day },
      include: [{ model: Habit, as: "habit", attributes: ["title"] }],
    }),
    CalendarEvent.findAll({
      where: {
        user_id: userId,
        start_time: {
          [Op.between]: [dayStart, nextDay],
        },
      },
    }),
  ]);

  const intervals = [];

  busySchedules.forEach((entry) => {
    const startMinutes = parseTimeToMinutes(entry.starttime);
    const endMinutes = parseTimeToMinutes(entry.endtime);
    const normalized = normalizeInterval({
      start: startMinutes,
      end: endMinutes,
      day: entry.day,
      title: entry.title,
      type: "busy",
    });
    if (normalized) intervals.push(normalized);
  });

  habitSchedules.forEach((entry) => {
    const startMinutes = parseTimeToMinutes(entry.starttime);
    const endMinutes = parseTimeToMinutes(entry.endtime);
    const normalized = normalizeInterval({
      start: startMinutes,
      end: endMinutes,
      day: entry.day,
      title: entry.habit?.title || "Habit",
      type: "habit",
    });
    if (normalized) intervals.push(normalized);
  });

  calendarEvents.forEach((event) => {
    const startDate = event.start_time ? new Date(event.start_time) : null;
    if (!startDate || Number.isNaN(startDate.getTime())) return;
    const eventDay = startDate.toISOString().split("T")[0];
    if (eventDay !== day) return;
    const startMinutes = startDate.getUTCHours() * 60 + startDate.getUTCMinutes();
    const endDate = event.end_time ? new Date(event.end_time) : null;
    const endMinutes = endDate && !Number.isNaN(endDate.getTime())
      ? endDate.getUTCHours() * 60 + endDate.getUTCMinutes()
      : null;

    const normalized = normalizeInterval({
      start: startMinutes,
      end: endMinutes,
      day: eventDay,
      title: event.title,
      type: "calendar",
    });

    if (normalized) intervals.push(normalized);
  });

  return intervals.sort((a, b) => a.start - b.start);
};

const findNextAvailableSlot = (intervals, requestedStart, durationMinutes) => {
  const windowStart = Math.max(6 * 60, requestedStart);
  const windowEnd = 22 * 60;
  let cursor = windowStart;

  for (const block of intervals) {
    if (cursor + durationMinutes <= block.start) {
      return cursor;
    }
    cursor = Math.max(cursor, block.end);
    if (cursor > windowEnd) break;
  }

  if (cursor + durationMinutes <= windowEnd) {
    return cursor;
  }

  return null;
};

const detectSingleDayScheduleConflict = async ({ userId, scheduleDecision }) => {
  const startMinutes = parseTimeToMinutes(scheduleDecision?.starttime);
  if (!scheduleDecision?.day || startMinutes == null) return null;

  const proposedDuration = (() => {
    const endMinutes = parseTimeToMinutes(scheduleDecision.endtime);
    if (endMinutes && endMinutes > startMinutes) return endMinutes - startMinutes;
    return DEFAULT_EVENT_DURATION_MINUTES;
  })();

  const proposedEnd = startMinutes + proposedDuration;
  const existingBlocks = await collectExistingDayBlocks({ userId, day: scheduleDecision.day });
  const conflict = existingBlocks.find((block) => startMinutes < block.end && block.start < proposedEnd);

  if (!conflict) {
    return { conflict: null, duration: proposedDuration, alternativeStart: null, existingBlocks };
  }

  const alternativeStart = findNextAvailableSlot(existingBlocks, proposedEnd, proposedDuration);

  return {
    conflict,
    duration: proposedDuration,
    alternativeStart,
    existingBlocks,
  };
};

const detectScheduleConflict = async ({ userId, scheduleDecision }) => {
  const occurrenceDays = buildRecurrenceDays(scheduleDecision);
  if (!occurrenceDays.length) return null;

  let firstNonConflict = null;

  for (const day of occurrenceDays) {
    const info = await detectSingleDayScheduleConflict({
      userId,
      scheduleDecision: { ...scheduleDecision, day },
    });

    if (info?.conflict) {
      return { ...info, conflictDay: day, occurrences: occurrenceDays };
    }

    if (!firstNonConflict) {
      firstNonConflict = { ...info, conflictDay: null, occurrences: occurrenceDays };
    }
  }

  return firstNonConflict;
};

const requestClaudeScheduleDecision = async ({ message, userContext, history }) => {
  const { timezone, currentDate, currentTime } = getReferenceDateInfo(userContext);

  const systemInstruction = [
    "You are Claude, an encouraging habit coach that can also add calendar events and one-off tasks.",
    "Decide whether the user wants a habit/routine, a scheduled calendar event, or a task/to-do.",
    "If it's a habit or routine request, respond ONLY with { action: 'habit' }.",
    "If they want to delete or cancel an existing scheduled event, respond ONLY with JSON: { action: 'delete-event', id (prefer id from busySchedules), title (string|null), day (YYYY-MM-DD|null), starttime (HH:mm|null), userReply (short tailored confirmation) }.",
    "If it's a task (a to-do without a precise meeting time), respond ONLY with JSON: { action: 'create-task', name, dueDate (YYYY-MM-DD|null), scheduleAfter (YYYY-MM-DD|null), durationMinutes (integer minutes), minDuration (integer|null), maxDuration (integer|null), splitUp (boolean), hoursLabel (string|null), color (string|null), status ('pending'|'done'|'missed'), userReply (short confirmation sentence tailored to the request) }.",
    "If they want to delete a reminder/notification, respond ONLY with JSON: { action: 'delete-reminder', id (integer|null), title (string|null), day (YYYY-MM-DD|null), starttime (HH:mm|null), userReply (short confirmation sentence tailored to the request) }.",
    "If they want a reminder/notification, respond ONLY with JSON: { action: 'create-reminder', title, message (string|null), day (YYYY-MM-DD), starttime (HH:mm|null, start of the event being reminded about), remindtime (HH:mm|null, exact reminder time when specified), leadMinutes (integer|null, minutes before the starttime if remindtime is missing), category (default 'Reminder'), priority ('high'|'medium'|'low'), type (default 'assistant_reminder'), mode ('in-person'|'online'|null), location (string|null), travelMinutes (integer|null), reason (short explanation of why you chose the timing), userReply (short confirmation sentence tailored to the request) }.",
    "If it's a calendar event and the user provided a clear title AND an explicit start time, respond ONLY with JSON: { action: 'create-event', title, day (YYYY-MM-DD), starttime (HH:mm, 24h), endtime (HH:mm|null), enddate (YYYY-MM-DD|null, required when repeat is not 'once'), repeat ('once'|'daily'|'weekly'|'custom'), customdays (comma-separated weekdays when repeat='custom' or to pin specific weekdays), notes (string|null), userReply (short confirmation sentence tailored to the request) }.",
    "Convert relative dates to YYYY-MM-DD. Support recurring ranges like 'every Monday in October' by filling repeat, customdays, and enddate. Never make up times; if any timing or title detail is missing or ambiguous, respond with { action: 'clarify', target: 'event'|'task'|'reminder'|null, question: 'follow-up to ask for missing details' }.",
    "Keep the reply strictly JSON with no markdown. Use recent conversation context and user goals to make each userReply feel specific—avoid canned or generic wording.",
    "Choose reminder timing thoughtfully: default to 60 minutes before in-person classes or appointments (add travelMinutes if the user mentions commute time), 10-15 minutes before online meetings, and around 30 minutes before general habits when details are light.",
    `Interpret all relative dates and times using this reference: today is ${currentDate} and the current time is ${currentTime || 'unknown'} in the ${timezone} timezone.`,
    `User context: ${JSON.stringify(userContext || {})}`,
  ].join("\n");

  const prompt = new HumanMessage(
    [
      "Based on the last few messages, decide if this is an event to schedule, a task to capture, or a habit idea.",
      "If you can't find a concrete start time and title for an event, ask a clarifying question instead of creating one. Do the same for tasks that need a due date or duration.",
      "When the user asks for repeating events or a date range, include the recurrence details instead of assuming a single day.",
      `Reference date: ${currentDate} (${timezone})${currentTime ? ` at ${currentTime}` : ""}.`,
      `User message: ${message}`,
    ].join("\n")
  );

  const reply = await callClaude([new SystemMessage(systemInstruction), ...buildConversationMessages(history), prompt]);
  return parseScheduleJson(reply);
};

const generateClaudeSuggestionReply = async ({
  habitSuggestion,
  systemInstruction,
  history,
}) => {
  if (!habitSuggestion) return null;

  const conversation = buildConversationMessages(history);
  const prompt = new HumanMessage(
    [
      "Share this starter habit with the user in one short, warm paragraph.",
      "Encourage them and ask if they'd like to add it or adjust details.",
      "Habit details:",
      JSON.stringify(habitSuggestion),
    ].join("\n"),
  );

  return callClaude([new SystemMessage(systemInstruction), ...conversation, prompt]);
};

export const generateHabitCreatedReply = async ({ habit, context }) => {
  const { dbOverview, userContext, history } = context || {};

  const systemInstruction = [
    "You are a warm, conversational AI assistant for the StepHabit platform.",
    "A habit was just saved for the user. Acknowledge it briefly and invite tweaks or next steps.",
    "Keep replies short and natural.",
    "Database overview:\n" + formatTableSummary(dbOverview || []),
    "User context:\n" + JSON.stringify(userContext || {}, null, 2),
  ].join("\n\n");

  const conversation = buildConversationMessages(history);
  const prompt = new HumanMessage(
    `Confirm the habit creation to the user in a friendly sentence and offer help adjusting it: ${JSON.stringify(habit)}`,
  );

  return (
    (await callClaude([new SystemMessage(systemInstruction), ...conversation, prompt])) ||
    "Your habit was saved. Want to adjust anything?"
  );
};

const generateScheduleCreatedReply = async ({ schedule, context }) => {
  const { dbOverview, userContext, history } = context || {};

  const normalizedSchedule = Array.isArray(schedule)
    ? {
        ...(schedule[0] || {}),
        occurrences: schedule.length,
      }
    : schedule;

  const systemInstruction = [
    "You are a warm, conversational AI assistant for the StepHabit platform.",
    "A calendar event was just saved. Confirm the details briefly and ask if the user wants tweaks.",
    "Keep replies short and natural.",
    "Database overview:\n" + formatTableSummary(dbOverview || []),
    "User context:\n" + JSON.stringify(userContext || {}, null, 2),
  ].join("\n\n");

  const conversation = buildConversationMessages(history);
  const prompt = new HumanMessage(
    `Confirm the event creation in a friendly sentence and offer help adjusting it: ${JSON.stringify(normalizedSchedule)}`
  );

  return (
    (await callClaude([new SystemMessage(systemInstruction), ...conversation, prompt])) ||
    "Your event was saved. Want to adjust anything?"
  );
};

const generateScheduleDeletedReply = async ({ schedule, context }) => {
  const { dbOverview, userContext, history } = context || {};

  const systemInstruction = [
    "You are a warm, conversational AI assistant for the StepHabit platform.",
    "A calendar event was just removed. Confirm the deletion briefly and ask if they want to clear anything else.",
    "Keep replies short and natural.",
    "Database overview:\n" + formatTableSummary(dbOverview || []),
    "User context:\n" + JSON.stringify(userContext || {}, null, 2),
  ].join("\n\n");

  const conversation = buildConversationMessages(history);
  const prompt = new HumanMessage(
    `Confirm the event deletion in a friendly sentence and invite further changes: ${JSON.stringify(schedule)}`
  );

  return (
    (await callClaude([new SystemMessage(systemInstruction), ...conversation, prompt])) ||
    "Got it—I've deleted that event. Want me to clear or reschedule anything else?"
  );
};

const generateTaskCreatedReply = async ({ task, context }) => {
  const { dbOverview, userContext, history } = context || {};

  const systemInstruction = [
    "You are a warm, conversational AI assistant for the StepHabit platform.",
    "A task/to-do was just saved. Confirm the details briefly and invite the user to refine timing or priority.",
    "Keep replies short, specific to their request, and avoid canned phrasing.",
    "Database overview:\n" + formatTableSummary(dbOverview || []),
    "User context:\n" + JSON.stringify(userContext || {}, null, 2),
  ].join("\n\n");

  const conversation = buildConversationMessages(history);
  const prompt = new HumanMessage(
    `Confirm the task creation in a friendly sentence and offer help adjusting it: ${JSON.stringify(task)}`
  );

  return (
    (await callClaude([new SystemMessage(systemInstruction), ...conversation, prompt])) ||
    "Your task is saved. Want to tweak the timing or details?"
  );
};

const generateScheduleConflictReply = async ({ scheduleDecision, conflictInfo, context }) => {
  const { dbOverview, userContext, history } = context || {};
  const { conflict, alternativeStart, duration, conflictDay, occurrences } = conflictInfo || {};

  const systemInstruction = [
    "You are a warm, conversational AI assistant for the StepHabit platform.",
    "A requested calendar event conflicts with an existing commitment. Explain the conflict briefly and propose a new time.",
    "Stay concise, friendly, and avoid markdown. Ask the user to confirm the suggested time or offer another.",
    "Database overview:\n" + formatTableSummary(dbOverview || []),
    "User context:\n" + JSON.stringify(userContext || {}, null, 2),
  ].join("\n\n");

  const conflictStart = conflict ? minutesToTime(conflict.start) : null;
  const conflictEnd = conflict ? minutesToTime(conflict.end) : null;
  const proposedStart = minutesToTime(parseTimeToMinutes(scheduleDecision?.starttime));
  const proposedEnd = minutesToTime(
    parseTimeToMinutes(scheduleDecision?.starttime || "") + (duration || DEFAULT_EVENT_DURATION_MINUTES)
  );
  const suggestedSlot = alternativeStart != null ? minutesToTime(alternativeStart) : null;

  const promptLines = [
    "Tell the user their requested time clashes with an existing item and suggest a better slot.",
    `Requested: ${scheduleDecision?.title || "Event"} on ${
      conflictDay || scheduleDecision?.day || "unknown day"
    } from ${proposedStart || "unknown"}${proposedEnd ? ` to ${proposedEnd}` : ""}.`,
  ];

  if (conflict) {
    promptLines.push(
      `Conflict: ${conflict.title || "Busy"} from ${conflictStart || "unknown"} to ${conflictEnd || "unknown"} (${conflict.type}).`
    );
  }

  if (occurrences?.length > 1) {
    promptLines.push(
      `Let them know the event was planned to repeat ${occurrences.length} times and this clash happens on ${
        conflictDay || "one of those days"
      }.`
    );
  }

  if (suggestedSlot) {
    const suggestedEnd = minutesToTime((alternativeStart || 0) + (duration || DEFAULT_EVENT_DURATION_MINUTES));
    promptLines.push(`Suggest rescheduling to ${suggestedSlot}${suggestedEnd ? `-${suggestedEnd}` : ""} and ask for confirmation.`);
  } else {
    promptLines.push("Suggest moving the event to the next available opening later that day and ask them to pick a time.");
  }

  const conversation = buildConversationMessages(history);
  const prompt = new HumanMessage(promptLines.join("\n"));

  return (
    (await callClaude([new SystemMessage(systemInstruction), ...conversation, prompt])) ||
    "That time is already booked. Want to try a different slot?"
  );
};

const deleteScheduleEvent = async ({ userId, decision }) => {
  try {
    const where = { user_id: userId };

    if (decision.id) where.id = decision.id;
    if (decision.day) where.day = decision.day;
    if (decision.starttime) where.starttime = decision.starttime;
    if (decision.title) where.title = { [Op.iLike]: `%${decision.title}%` };

    const target = await BusySchedule.findOne({ where, order: [["day", "ASC"], ["starttime", "ASC"], ["id", "ASC"]] });
    if (!target) return null;

    const plain = target.get({ plain: true });
    await target.destroy();
    return plain;
  } catch (error) {
    console.error("Failed to delete schedule", error?.message || error);
    return null;
  }
};

const generateScheduleNotFoundReply = async ({ decision, context }) => {
  const { dbOverview, userContext, history } = context || {};

  const systemInstruction = [
    "You are a warm, conversational AI assistant for the StepHabit platform.",
    "The user asked to delete a calendar event, but no matching item was found. Ask for the missing details succinctly.",
    "Keep replies short, specific, and avoid markdown.",
    "Database overview:\n" + formatTableSummary(dbOverview || []),
    "User context:\n" + JSON.stringify(userContext || {}, null, 2),
  ].join("\n\n");

  const conversation = buildConversationMessages(history);
  const prompt = new HumanMessage(
    [
      "Craft one sentence explaining you couldn't find the event to delete and ask for a specific title, date, or start time.",
      `User request details: ${JSON.stringify(decision)}`,
    ].join("\n")
  );

  return (
    (await callClaude([new SystemMessage(systemInstruction), ...conversation, prompt])) ||
    "I couldn't find that event—can you share the title, date, or start time so I delete the right one?"
  );
};

export const generateAiChatReply = async ({ userId, message, history: providedHistory = null }) => {
  const [dbOverview, userContext, history, reflectionInsights] = await Promise.all([
    describeTables(),
    loadUserContext(userId),
    providedHistory
      ? Promise.resolve(providedHistory)
      : getChatHistory(userId, MESSAGE_HISTORY_LIMIT),
    loadReflectionInsights(userId),
  ]);

  const habitAnalysis = analyzeHabitIntent(message, history);

  const progressDecision = await requestClaudeProgressDecision({
    message,
    userContext,
    history,
  });

  const planDecision = await requestClaudeScheduleDecision({
    message,
    userContext,
    history,
  });

  const systemInstruction = [
    "You are a warm, conversational AI assistant for the StepHabit platform.",
    "Respond with short, human-feeling paragraphs (avoid bullet lists unless requested).",
    "You can see the database overview and the current user's context—use them naturally in conversation.",
    "Stay encouraging and keep the chat flowing with one clear next step in each reply.",
    "When users ask why a habit is missed or succeeds, study the recentNotes on that habit and the reflected reasons from the progress table to describe patterns or reasons before suggesting new habits.",
    "Database overview:\n" + formatTableSummary(dbOverview),
    "User context:\n" + JSON.stringify(userContext || {}, null, 2),
    "Recent habit notes:\n" + buildRecentNotesDigest(userContext?.habits || []),
    "Reflected reasons:\n" + formatReflectionInsights(reflectionInsights),
  ].join("\n\n");

  let habitSuggestion = habitAnalysis.habitSuggestion;
  let replyFromClaude = progressDecision?.userReply || null;
  let loggedProgress = null;
  let createdSchedule = null;
  let createdTask = null;
  let deletedSchedule = null;
  let deletedReminder = null;
  let finalIntent = habitAnalysis.intent;
  let scheduleClarification = null;
  let scheduleConflict = null;
  let taskClarification = null;
  let reminderClarification = null;
  let createdReminder = null;

  if (planDecision?.action === "habit" && finalIntent === "chat") {
    finalIntent = "suggest";
  }

  if (planDecision?.action === "clarify") {
    if (planDecision.target === "task") {
      taskClarification = planDecision.question;
      if (finalIntent === "chat") {
        finalIntent = "clarify-task";
      }
    } else if (planDecision.target === "reminder") {
      reminderClarification = planDecision.question;
      if (finalIntent === "chat") {
        finalIntent = "clarify-reminder";
      }
    } else {
      scheduleClarification = planDecision.question;
      if (finalIntent === "chat") {
        finalIntent = "clarify-schedule";
      }
    }
  }

  if (progressDecision) {
    try {
      const entry = await Progress.create({
        user_id: userId,
        habit_id: progressDecision.habitId,
        status: progressDecision.status,
        reflected_reason: progressDecision.note,
        progress_date: new Date(),
      });

      loggedProgress = {
        id: entry.id,
        habitId: entry.habit_id,
        status: entry.status,
        note: entry.reflected_reason,
        progressDate: entry.progress_date,
      };

      finalIntent = "log-progress";
    } catch (error) {
      console.error("Failed to save progress from Claude decision", error?.message || error);
    }
  }

  if (scheduleClarification && !replyFromClaude && !loggedProgress) {
    replyFromClaude = scheduleClarification;
  }

  if (taskClarification && !replyFromClaude && !loggedProgress) {
    replyFromClaude = taskClarification;
  }

  if (reminderClarification && !replyFromClaude && !loggedProgress) {
    replyFromClaude = reminderClarification;
  }

  if (progressDecision && !replyFromClaude) {
    const matchedHabit = (userContext?.habits || []).find((h) => h.id === progressDecision.habitId);
    const recapPrompt = new HumanMessage(
      [
        "Give one short, friendly sentence confirming I logged the habit progress.",
        `Habit: ${matchedHabit?.title || "Unknown habit"} (${progressDecision.status})`,
        progressDecision.note ? `Note to mention: ${progressDecision.note}` : "No extra note provided.",
      ].join("\n")
    );

    replyFromClaude = await callClaude([new SystemMessage(systemInstruction), ...buildConversationMessages(history), recapPrompt]);
  }

  if (!loggedProgress && planDecision?.action === "create-task") {
    try {
      const parseDate = (value) => {
        if (!value) return null;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      };

      const created = await Task.create({
        user_id: userId,
        name: planDecision.name,
        duration_minutes: planDecision.durationMinutes ?? 60,
        min_duration_minutes: planDecision.minDuration,
        max_duration_minutes: planDecision.maxDuration,
        split_up: Boolean(planDecision.splitUp),
        hours_label: planDecision.hoursLabel,
        schedule_after: parseDate(planDecision.scheduleAfter),
        due_date: parseDate(planDecision.dueDate),
        color: planDecision.color,
        status: planDecision.status || "pending",
      });

      createdTask = created.get({ plain: true });
      finalIntent = "create-task";
      replyFromClaude =
        planDecision.userReply ||
        (await generateTaskCreatedReply({ task: createdTask, context: { dbOverview, userContext, history } }));
    } catch (error) {
      console.error("Failed to save task from Claude decision", error?.message || error);
    }
  }

  if (!loggedProgress && planDecision?.action === "create-reminder") {
    const reminderDate = deriveReminderDate({
      day: planDecision.day,
      starttime: planDecision.starttime,
      remindtime: planDecision.remindtime,
      leadMinutes: planDecision.leadMinutes,
    });

    if (!reminderDate) {
      finalIntent = "clarify-reminder";
      replyFromClaude =
        planDecision.userReply ||
        "I can set that reminder—can you confirm the exact day and time for the alert?";
    } else {
      try {
        const notification = await Notification.create({
          user_id: userId,
          title: planDecision.title,
          message: planDecision.message || `Reminder: ${planDecision.title}`,
          type: planDecision.type || "assistant_reminder",
          category: planDecision.category || "Reminder",
          priority: planDecision.priority || "medium",
          scheduled_for: reminderDate,
          metadata: {
            leadMinutes: planDecision.leadMinutes ?? null,
            eventDay: planDecision.day,
            eventStart: planDecision.starttime,
            reminderTime: planDecision.remindtime,
            travelMinutes: planDecision.travelMinutes ?? null,
            location: planDecision.location || null,
            mode: planDecision.mode || null,
            reason: planDecision.reason || null,
          },
        });

        createdReminder = notification.get({ plain: true });
        finalIntent = "create-reminder";
        replyFromClaude =
          planDecision.userReply ||
          `Got it—I'll remind you about ${planDecision.title} on ${formatDateLabel(reminderDate)}.`;
      } catch (error) {
        console.error("Failed to save reminder from Claude decision", error?.message || error);
      }
    }
  }

  if (!loggedProgress && planDecision?.action === "delete-reminder") {
    try {
      const reminder = await findReminderForDeletion({ userId, decision: planDecision });
      finalIntent = "delete-reminder";

      if (reminder) {
        await Notification.destroy({ where: { id: reminder.id, user_id: userId } });
        deletedReminder = reminder.get ? reminder.get({ plain: true }) : reminder;
        replyFromClaude =
          planDecision.userReply ||
          `Okay, I removed the reminder${deletedReminder.title ? ` for "${deletedReminder.title}"` : ""}.`;
      } else {
        replyFromClaude =
          planDecision.userReply ||
          "I couldn't find that reminder. Can you share the title or scheduled time?";
        if (!planDecision.title && !planDecision.day && !planDecision.starttime) {
          finalIntent = "clarify-reminder";
        }
      }
    } catch (error) {
      console.error("Failed to delete reminder from Claude decision", error?.message || error);
    }
  }

  if (!loggedProgress && planDecision?.action === "delete-event") {
    try {
      const removed = await deleteScheduleEvent({ userId, decision: planDecision });
      finalIntent = "delete-schedule";

      if (removed) {
        deletedSchedule = removed;
        replyFromClaude =
          planDecision.userReply ||
          (await generateScheduleDeletedReply({ schedule: removed, context: { dbOverview, userContext, history } }));
      } else {
        replyFromClaude = await generateScheduleNotFoundReply({
          decision: planDecision,
          context: { dbOverview, userContext, history },
        });
      }
    } catch (error) {
      console.error("Failed to delete schedule from Claude decision", error?.message || error);
    }
  }

  if (!loggedProgress && planDecision?.action === "create-event") {
    scheduleConflict = await detectScheduleConflict({ userId, scheduleDecision: planDecision });

    if (scheduleConflict?.conflict) {
      finalIntent = "schedule-conflict";
      replyFromClaude = await generateScheduleConflictReply({
        scheduleDecision: planDecision,
        conflictInfo: scheduleConflict,
        context: { dbOverview, userContext, history },
      });
    } else {
      try {
        const occurrenceDays =
          scheduleConflict?.occurrences?.length
            ? scheduleConflict.occurrences
            : buildRecurrenceDays(planDecision);

        const payloads = (occurrenceDays.length ? occurrenceDays : [planDecision.day]).map((day) => ({
          user_id: userId,
          title: planDecision.title,
          day,
          starttime: planDecision.starttime,
          endtime: planDecision.endtime || null,
          enddate: planDecision.enddate || planDecision.day,
          repeat: planDecision.repeat || "once",
          customdays: planDecision.repeat === "custom" ? planDecision.customdays || null : null,
          notes: planDecision.notes || null,
        }));

        const created = await BusySchedule.bulkCreate(payloads, { returning: true });

        createdSchedule = created.map((entry) => entry.get({ plain: true }));
        finalIntent = "create-schedule";
        replyFromClaude =
          planDecision.userReply ||
          (await generateScheduleCreatedReply({ schedule: createdSchedule, context: { dbOverview, userContext, history } }));
      } catch (error) {
        console.error("Failed to save schedule from Claude decision", error?.message || error);
      }
    }
  }

  if (finalIntent === "suggest") {
    habitSuggestion =
      (await requestClaudeHabitSuggestion({ message, userContext })) || buildHabitSuggestion(message);

    if (habitSuggestion) {
      replyFromClaude = await generateClaudeSuggestionReply({
        habitSuggestion,
        systemInstruction,
        history,
      });
    }
  } else if (finalIntent === "chat" && !loggedProgress && !createdSchedule && !createdTask) {
    replyFromClaude = await callClaude(buildChatMessages({ systemInstruction, history, message }));
  }

  const reply =
    habitAnalysis.reply ||
    replyFromClaude ||
    fallbackReply({ message, userContext, dbOverview, history });

  return {
    reply,
    intent: finalIntent,
    habitSuggestion,
    loggedProgress,
    createdSchedule,
    createdTask,
    createdReminder,
    deletedSchedule,
    deletedReminder,
    scheduleConflict,
    context: { dbOverview, userContext, history, reflectionInsights },
  };
};
