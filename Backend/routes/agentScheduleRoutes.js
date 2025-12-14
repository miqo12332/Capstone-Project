import express from "express";
import { createScheduleEvent } from "../services/scheduleEventService.js";

const router = express.Router();

router.post("/create", async (req, res) => {
  try {
    const result = await createScheduleEvent(req.body || {});

    if (result.status === "EVENT_CREATED") {
      return res.status(201).json(result);
    }

    if (result.status === "EVENT_CONFLICT") {
      return res.status(409).json(result);
    }

    if (result.status === "EVENT_NEEDS_INFO") {
      return res.status(400).json(result);
    }

    return res.status(500).json(result);
  } catch (error) {
    console.error("/agent-schedules/create failed", error);
    return res.status(500).json({ status: "EVENT_NOT_CREATED", reason: "Internal server error" });
  }
});

export default router;
