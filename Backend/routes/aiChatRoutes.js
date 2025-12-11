import express from "express";

import { generateAiChatReply } from "../services/aiChatService.js";
import { getChatHistory, saveMessage } from "../services/memoryService.js";

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

router.post("/message", async (req, res) => {
  const { userId, message } = req.body;

  console.log("/ai-chat/message payload", req.body);

  if (!userId || !message) {
    return res.status(400).json({ error: "userId and message are required" });
  }

  try {
    await saveMessage({ userId, role: "user", content: message });

    const { reply, context } = await generateAiChatReply({ userId, message });

    await saveMessage({
      userId,
      role: "assistant",
      content: reply,
      metadata: { dbOverview: context.dbOverview.map((t) => t.name) },
    });

    const history = await getChatHistory(userId, 50);

    return res.json({ reply, history, context });
  } catch (error) {
    console.error("/ai-chat/message failed", error);
    return res.status(500).json({ error: "Unable to process AI chat message" });
  }
});

export default router;
