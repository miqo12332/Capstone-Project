import express from "express";
import { analyzeMessage, getChatAgentStatus } from "../services/assistantAI.js";
import { createHabit, listHabits } from "../services/habitService.js";
import {
  findPendingHabitSuggestion,
  getChatHistory,
  getProfileMemory,
  saveMessage,
  saveProfileMemory,
} from "../services/memoryService.js";
import { runReasoningAgent, getAgentStatus } from "../services/claudeAgent.js";
import buildSnapshot from "../services/snapshotBuilder.js";

const normalizeHabitSummary = (snapshot) => {
  const habitSummaries = snapshot?.progress?.habitSummaries || [];
  const totalCompleted = habitSummaries.reduce((acc, item) => acc + (item.completed || 0), 0);
  const totalMissed = habitSummaries.reduce((acc, item) => acc + (item.missed || 0), 0);

  return {
    profile: {
      name: snapshot?.user?.name || "Your coach",
      goal: snapshot?.user?.primary_goal || null,
      focusArea: snapshot?.user?.focus_area || null,
      commitment: snapshot?.user?.daily_commitment || null,
      supportPreference: snapshot?.user?.support_preference || null,
    },
    progress: {
      completionRate: snapshot?.progress?.completionRate || 0,
      completed: totalCompleted,
      missed: totalMissed,
      habitSummaries,
    },
    topKeywords: habitSummaries
      .map((item) => item.title)
      .filter(Boolean)
      .map((title) => ({ keyword: title.split(" ")[0] || title }))
      .slice(0, 5),
    upcoming: snapshot?.schedules?.upcoming || [],
  };
};

const router = express.Router();

router.post("/chat", async (req, res) => {
  const { userId, message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: "userId and message are required" });
  }

  try {
    const history = await getChatHistory(userId);
    await saveMessage({ userId, role: "user", content: message });

    const pendingSuggestion = findPendingHabitSuggestion(history);
    const analysis = await analyzeMessage(message, history);

    let reply = analysis.reply;
    let createdHabit = null;

    if (analysis.intent === "confirm-add") {
      const suggestion = analysis.habitSuggestion || pendingSuggestion;

      if (!suggestion) {
        reply = "I don't have a habit suggestion ready. Tell me what you want to start, and I'll propose one.";
        await saveMessage({ userId, role: "assistant", content: reply });
      } else {
        const habit = await createHabit(userId, suggestion);
        createdHabit = habit;
        reply = `Awesome! I added "${habit.title}". Want to tweak the details?`;

        await saveMessage({
          userId,
          role: "assistant",
          content: reply,
          metadata: { habitSuggestion: suggestion, createdHabit: true },
        });
      }
    } else {
      const metadata = analysis.habitSuggestion
        ? { habitSuggestion: analysis.habitSuggestion }
        : null;

      if (analysis.intent === "suggest" && analysis.habitSuggestion) {
        reply = `${analysis.reply} Would you like me to add it?`;
      }

      await saveMessage({ userId, role: "assistant", content: reply, metadata });
    }

    const habits = await listHabits(userId);
    const updatedHistory = await getChatHistory(userId);
    const agent = getChatAgentStatus();

    return res.json({ reply, habits, history: updatedHistory, agent, createdHabit });
  } catch (error) {
    console.error("/assistant/chat failed", error);
    return res.status(500).json({ error: "Failed to process chat message" });
  }
});

router.get("/history", async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const [history, snapshot] = await Promise.all([
      getChatHistory(userId),
      buildSnapshot(userId),
    ]);

    const summary = normalizeHabitSummary(snapshot);
    return res.json({ history, summary, agent: getChatAgentStatus() });
  } catch (error) {
    console.error("/assistant/history failed", error);
    return res.status(500).json({ error: "Failed to load assistant history" });
  }
});

router.get("/profile", async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const memory = await getProfileMemory(userId);
    return res.json(memory || { about: "", updatedAt: null });
  } catch (error) {
    console.error("/assistant/profile get failed", error);
    return res.status(500).json({ error: "Failed to load assistant profile" });
  }
});

router.post("/profile", async (req, res) => {
  const { userId, about } = req.body;
  if (!userId || !about) {
    return res.status(400).json({ error: "userId and about are required" });
  }

  try {
    const memory = await saveProfileMemory(userId, about);
    return res.json(memory);
  } catch (error) {
    console.error("/assistant/profile save failed", error);
    return res.status(500).json({ error: "Failed to save assistant profile" });
  }
});

router.get("/summary", async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const [snapshot, history, profileMemory] = await Promise.all([
      buildSnapshot(userId),
      getChatHistory(userId, 12),
      getProfileMemory(userId),
    ]);

    const { reply, meta } = await runReasoningAgent({
      snapshot,
      insightText: "",
      history,
      profileMemory,
    });

    return res.json({ summary: reply, agent: meta });
  } catch (error) {
    console.error("/assistant/summary failed", error);
    const status = error?.message?.includes("API key") ? 401 : 500;
    return res.status(status).json({
      error: error?.message || "Failed to generate AI summary",
      agent: getAgentStatus(),
    });
  }
});

export default router;
