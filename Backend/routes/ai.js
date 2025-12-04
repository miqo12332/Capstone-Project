// Routes for AI reasoning requests. Wraps the Claude agent behind a server-only API.
import express from "express";
import rateLimit from "express-rate-limit";

import { runReasoningAgent, getAgentStatus } from "../services/claudeAgent.js";

const router = express.Router();

// Optional rate limiting to prevent abuse of the AI endpoint.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests. Please try again shortly." },
});

const validateRequest = (body = {}) => {
  const { snapshot, history } = body;

  if (!snapshot || typeof snapshot !== "object") {
    return "A snapshot object is required.";
  }

  if (history && !Array.isArray(history)) {
    return "History must be an array when provided.";
  }

  return null;
};

router.get("/status", (_req, res) => {
  res.json(getAgentStatus());
});

router.post("/reason", aiLimiter, async (req, res) => {
  const validationError = validateRequest(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { snapshot, insightText = "", history = [] } = req.body;

  console.log("[AI] Received reasoning request", {
    snapshotKeys: Object.keys(snapshot || {}),
    historyLength: Array.isArray(history) ? history.length : 0,
  });

  try {
    const result = await runReasoningAgent({ snapshot, insightText, history });

    return res.json({
      reply: result.reply,
      meta: result.meta,
    });
  } catch (error) {
    console.error("[AI] Reasoning failed", error);
    const status = error?.message?.includes("API key") ? 401 : 500;
    return res.status(status).json({ error: "Unable to complete AI reasoning request." });
  }
});

export default router;
