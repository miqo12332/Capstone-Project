import express from "express"
import { ChatAnthropic } from "@langchain/anthropic"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"

import Schedule from "../models/Schedule.js"
import BusySchedule from "../models/BusySchedule.js"
import Habit from "../models/Habit.js"

const router = express.Router()

const CLAUDE_BASE_URL = (process.env.CLAUDE_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "")
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20240620"
const API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY

const loadSchedules = async (userId) => {
  const [habitSchedules, busySchedules] = await Promise.all([
    Schedule.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Habit,
          as: "habit",
          attributes: ["id", "title"],
          required: false,
        },
      ],
      order: [["day", "ASC"], ["starttime", "ASC"]],
    }),
    BusySchedule.findAll({
      where: { user_id: userId },
      order: [["day", "ASC"], ["starttime", "ASC"]],
    }),
  ])

  const mappedSchedules = habitSchedules.map((s) => ({
    ...s.toJSON(),
    type: "habit",
    custom_title: null,
  }))

  const mappedBusy = busySchedules.map((b) => ({
    ...b.toJSON(),
    type: "custom",
    habit: null,
    habit_id: null,
    custom_title: b.title,
  }))

  return [...mappedSchedules, ...mappedBusy].sort((a, b) => {
    const dayA = new Date(a.day).getTime()
    const dayB = new Date(b.day).getTime()
    if (dayA !== dayB) return dayA - dayB
    return (a.starttime || "").localeCompare(b.starttime || "")
  })
}

const formatScheduleList = (schedules = []) => {
  if (!schedules.length) return "(no scheduled events)"
  return schedules
    .map((item) => {
      const label = item.custom_title || item.habit?.title || "Untitled"
      const end = item.endtime ? `-${item.endtime}` : ""
      return `${item.day} ${item.starttime || "??"}${end}: ${label}`
    })
    .join("\n")
}

const systemPrompt = [
  "You are an AI agent whose ONLY responsibility is to add events to the user's schedule.",
  "You do not chat. You do not speculate. You do not pretend actions succeeded.",
  "Timezone: Asia/Yerevan (UTC+4). Always restate relative dates as YYYY-MM-DD.",
  "REQUIRED FIELDS: Title, Date (YYYY-MM-DD), Start time, End time, Timezone.",
  "When all required fields are present, immediately respond in the EVENT_CREATED format.",
  "If any field is missing or ambiguous, ask ONE clarifying question and respond with EVENT_NOT_CREATED.",
  "Output format must be strictly:\nEVENT_CREATED\nTitle:\nDate:\nTime:\nTimezone:\n",
  "If you cannot create the event, respond with:\nEVENT_NOT_CREATED\nReason:",
].join(" \n")

const parseAgentEvent = (text = "") => {
  if (!text.trim().startsWith("EVENT_CREATED")) return null

  const title = text.match(/Title:\s*(.*)/i)?.[1]?.trim()
  const date = text.match(/Date:\s*(.*)/i)?.[1]?.trim()
  const time = text.match(/Time:\s*(.*)/i)?.[1]?.trim()
  const timezone = text.match(/Timezone:\s*(.*)/i)?.[1]?.trim()

  if (!title || !date || !time || !timezone) return null

  const [starttime, endtime] = time.split(/\s*-\s*/)
  if (!starttime || !endtime) return null

  return { title, date, starttime, endtime, timezone }
}

router.post("/message", async (req, res) => {
  const { userId, message } = req.body
  if (!userId || !message) {
    return res.status(400).json({ error: "userId and message are required" })
  }

  if (!API_KEY) {
    return res
      .status(503)
      .json({ error: "AI schedule agent is unavailable (missing API key)." })
  }

  try {
    const schedules = await loadSchedules(userId)

    const chat = new ChatAnthropic({
      apiKey: API_KEY,
      baseURL: CLAUDE_BASE_URL,
      model: CLAUDE_MODEL,
      temperature: 0,
      maxTokens: 512,
    })

    const scheduleContext = formatScheduleList(schedules)

    const response = await chat.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(
        [
          "Existing scheduled events (for overlap awareness):",
          scheduleContext,
          "User request:",
          message,
        ].join("\n\n"),
      ),
    ])

    const reply =
      typeof response?.content === "string"
        ? response.content
        : response?.content?.map?.((p) => p.text).filter(Boolean).join("\n") || ""

    const parsed = parseAgentEvent(reply)
    let createdSchedule = null

    if (parsed) {
      const created = await BusySchedule.create({
        user_id: userId,
        title: parsed.title,
        day: parsed.date,
        starttime: parsed.starttime,
        endtime: parsed.endtime,
        repeat: "once",
        notes: `Added via Habit AI at ${parsed.timezone}`,
      })

      createdSchedule = { ...created.toJSON(), type: "custom", custom_title: parsed.title, habit: null }
    }

    const latestSchedules = parsed ? await loadSchedules(userId) : schedules

    return res.json({ reply, createdSchedule, schedules: latestSchedules })
  } catch (error) {
    console.error("[schedule-agent] failed", error)
    return res.status(500).json({ error: "Failed to contact the schedule agent" })
  }
})

router.get("/schedules/:userId", async (req, res) => {
  try {
    const schedules = await loadSchedules(req.params.userId)
    return res.json({ schedules })
  } catch (error) {
    console.error("[schedule-agent] list failed", error)
    return res.status(500).json({ error: "Unable to load schedules" })
  }
})

export default router
