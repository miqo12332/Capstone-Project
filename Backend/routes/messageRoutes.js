import express from "express";
import { Op } from "sequelize";
import { ChatMessage, User } from "../models/index.js";

const router = express.Router();

const serializeUser = (user) =>
  user
    ? {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      }
    : null;

const serializeMessage = (msg) => ({
  id: msg.id,
  content: msg.content,
  sender_id: msg.sender_id,
  receiver_id: msg.receiver_id,
  created_at: msg.created_at,
  read_at: msg.read_at,
  sender: serializeUser(msg.sender),
  recipient: serializeUser(msg.recipient),
});

// Fetch a user's conversation threads with last message + unread counts
router.get("/:userId/threads", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const messages = await ChatMessage.findAll({
      where: {
        [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
      },
      include: [
        { model: User, as: "sender", attributes: ["id", "name", "email", "avatar"] },
        { model: User, as: "recipient", attributes: ["id", "name", "email", "avatar"] },
      ],
      order: [["created_at", "DESC"]],
    });

    const threads = new Map();

    messages.forEach((msg) => {
      const otherUser =
        Number(msg.sender_id) === Number(userId) ? msg.recipient : msg.sender;
      if (!otherUser) return;

      const key = otherUser.id;
      const current = threads.get(key) || {
        user: serializeUser(otherUser),
        lastMessage: null,
        unread: 0,
      };

      if (!current.lastMessage) {
        current.lastMessage = serializeMessage(msg);
      }

      if (Number(msg.receiver_id) === Number(userId) && !msg.read_at) {
        current.unread += 1;
      }

      threads.set(key, current);
    });

    res.json(Array.from(threads.values()));
  } catch (err) {
    next(err);
  }
});

// Fetch the full conversation between two users
router.get("/:userId/with/:otherId", async (req, res, next) => {
  try {
    const { userId, otherId } = req.params;
    const messages = await ChatMessage.findAll({
      where: {
        [Op.or]: [
          { sender_id: userId, receiver_id: otherId },
          { sender_id: otherId, receiver_id: userId },
        ],
      },
      include: [
        { model: User, as: "sender", attributes: ["id", "name", "email", "avatar"] },
        { model: User, as: "recipient", attributes: ["id", "name", "email", "avatar"] },
      ],
      order: [["created_at", "ASC"]],
    });

    res.json(messages.map(serializeMessage));
  } catch (err) {
    next(err);
  }
});

// Send a new message
router.post("/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { recipientId, content } = req.body;

    if (!recipientId || !content || !String(content).trim()) {
      return res.status(400).json({ error: "recipientId and content are required" });
    }

    const message = await ChatMessage.create({
      sender_id: userId,
      receiver_id: recipientId,
      content: String(content).trim(),
    });

    const populated = await ChatMessage.findByPk(message.id, {
      include: [
        { model: User, as: "sender", attributes: ["id", "name", "email", "avatar"] },
        { model: User, as: "recipient", attributes: ["id", "name", "email", "avatar"] },
      ],
    });

    res.status(201).json(serializeMessage(populated));
  } catch (err) {
    next(err);
  }
});

// Mark a conversation as read
router.put("/:userId/with/:otherId/read", async (req, res, next) => {
  try {
    const { userId, otherId } = req.params;
    const [updated] = await ChatMessage.update(
      { read_at: new Date() },
      {
        where: {
          receiver_id: userId,
          sender_id: otherId,
          read_at: { [Op.is]: null },
        },
      }
    );

    res.json({ updated });
  } catch (err) {
    next(err);
  }
});

export default router;
