import { Op } from "sequelize";
import AssistantMemory from "../models/AssistantMemory.js";

export async function saveMessage({ userId, role, content, metadata = null }) {
  const record = await AssistantMemory.create({
    user_id: userId,
    role,
    content,
    keywords: metadata,
  });
  return mapRecord(record);
}

export async function getChatHistory(userId, limit = 20) {
  const records = await AssistantMemory.findAll({
    where: { user_id: userId, role: { [Op.in]: ["user", "assistant"] } },
    order: [["created_at", "ASC"]],
    limit,
  });
  return records.map(mapRecord);
}

export async function saveProfileMemory(userId, about) {
  if (!userId || !about) throw new Error("userId and about are required");
  const record = await AssistantMemory.create({
    user_id: userId,
    role: "profile",
    content: about,
    keywords: null,
  });
  return { about, updatedAt: record.created_at };
}

export async function getProfileMemory(userId) {
  if (!userId) throw new Error("userId is required");
  const record = await AssistantMemory.findOne({
    where: { user_id: userId, role: "profile" },
    order: [["created_at", "DESC"]],
  });

  if (!record) return null;
  return { about: record.content, updatedAt: record.created_at };
}

export function findPendingHabitSuggestion(history) {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i];
    if (entry.role !== "assistant") continue;
    if (entry.metadata?.createdHabit) continue;
    if (entry.metadata?.habitSuggestion) return entry.metadata.habitSuggestion;
  }
  return null;
}

function mapRecord(record) {
  const plain = record.get({ plain: true });
  return {
    id: plain.id,
    role: plain.role,
    content: plain.content,
    metadata: plain.keywords || null,
    createdAt: plain.created_at,
  };
}
