import express from "express";

import { generateAiChatReply, generateHabitCreatedReply } from "../services/aiChatService.js";
import { createHabit } from "../services/habitService.js";
import {
  deleteChatHistory,
  findPendingHabitSuggestion,
  getChatHistory,
  saveMessage,
} from "../services/memoryService.js";

const router = express.Router();

router.get("/history", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  try {
    const history = await getChatHistory(userId, 50);
    return res.json({ history });
  } catch (error) {
    console.error("/ai-chat/history failed", error);
    return res.status(500).json({ error: "Unable to load AI chat history" });
  }
});

router.delete("/history", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  try {
    await deleteChatHistory(Number(userId));
    return res.json({ success: true });
  } catch (error) {
    console.error("/ai-chat/history delete failed", error);
    return res.status(500).json({ error: "Unable to delete AI chat history" });
  }
});

router.post("/message", async (req, res) => {
  const { userId, message } = req.body;

  console.log("/ai-chat/message payload", req.body);

  if (!userId || !message) {
    return res.status(400).json({ error: "userId and message are required" });
  }

  try {
    const history = await getChatHistory(userId, 50);
    await saveMessage({ userId, role: "user", content: message });

    const { reply, context, intent, habitSuggestion, loggedProgress, createdSchedule } = await generateAiChatReply({
      userId,
      message,
      history,
    });

    let finalReply = reply;
    let createdHabit = null;
    let metadata = context?.dbOverview?.length
      ? { dbOverview: context.dbOverview.map((t) => t.name) }
      : null;

    if (intent === "confirm-add") {
      const suggestion = habitSuggestion || findPendingHabitSuggestion(history);
      if (!suggestion) {
        finalReply = reply;
      } else {
        createdHabit = await createHabit(userId, suggestion);
        finalReply = await generateHabitCreatedReply({ habit: createdHabit, context });
        metadata = { ...(metadata || {}), habitSuggestion: suggestion, createdHabit: true };

        if (context?.userContext) {
          const existingHabits = context.userContext.habits || [];
          context.userContext.habits = [
            ...existingHabits,
            {
              id: createdHabit.id,
              title: createdHabit.title,
              category: createdHabit.category,
              goal: createdHabit.goal,
              progressLogs: 0,
              schedules: [],
            },
          ];
        }
      }
    } else if (intent === "suggest" && habitSuggestion) {
      finalReply = reply;
      metadata = { ...(metadata || {}), habitSuggestion };
    } else if (intent === "log-progress" && loggedProgress) {
      metadata = { ...(metadata || {}), loggedProgress };
    } else if (intent === "create-schedule" && createdSchedule) {
      metadata = { ...(metadata || {}), createdSchedule };
    }

    await saveMessage({
      userId,
      role: "assistant",
      content: finalReply,
      metadata,
    });

    const latestHistory = await getChatHistory(userId, 50);

    return res.json({
      reply: finalReply,
      history: latestHistory,
      context,
      createdHabit,
      loggedProgress,
      createdSchedule,
    });
  } catch (error) {
    console.error("/ai-chat/message failed", error);
    return res.status(500).json({ error: "Unable to process AI chat message" });
  }
});

export default router;
