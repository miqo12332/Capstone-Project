// Routes for AI reasoning requests. Wraps the Claude agent behind a server-only API.
import express from "express";

import { runReasoningAgent, getAgentStatus } from "../services/claudeAgent.js";

const router = express.Router();

// Optional rate limiting to prevent abuse of the AI endpoint.
// A lightweight in-memory limiter avoids an external dependency and keeps the
// endpoint available even in constrained environments (e.g., during offline CI
// runs). It enforces a rolling one-minute window per IP.
const WINDOW_MS = 60 * 1000
const MAX_REQUESTS = 5
const requestLog = new Map()

const aiLimiter = (req, res, next) => {
  const now = Date.now()
  const ip = req.ip || req.connection?.remoteAddress || "global"
  const windowStart = now - WINDOW_MS

  const recent = (requestLog.get(ip) || []).filter((ts) => ts > windowStart)
  recent.push(now)
  requestLog.set(ip, recent)

  if (recent.length > MAX_REQUESTS) {
    return res
      .status(429)
      .json({ error: "Too many AI requests. Please try again shortly." })
  }

  next()
}

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
