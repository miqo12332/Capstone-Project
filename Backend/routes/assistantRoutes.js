import express from "express";
import { analyzeMessage } from "../services/assistantAI.js";
import { createHabit, listHabits } from "../services/habitService.js";
import {
  findPendingHabitSuggestion,
  getChatHistory,
  saveMessage,
} from "../services/memoryService.js";

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

    if (analysis.intent === "confirm-add") {
      const suggestion = analysis.habitSuggestion || pendingSuggestion;

      if (!suggestion) {
        reply = "I don't have a habit suggestion ready. Tell me what you want to start, and I'll propose one.";
        await saveMessage({ userId, role: "assistant", content: reply });
      } else {
        const habit = await createHabit(userId, suggestion);
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

    return res.json({ reply, habits, history: updatedHistory });
  } catch (error) {
    console.error("/assistant/chat failed", error);
    return res.status(500).json({ error: "Failed to process chat message" });
  }
});

export default router;
