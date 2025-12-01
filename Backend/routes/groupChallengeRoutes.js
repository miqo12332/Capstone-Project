import express from "express";
import {
  GroupChallenge,
  User,
  UserGroupChallenge,
  GroupChallengeMessage,
} from "../models/index.js";

const router = express.Router();

// Get all challenges with participants
router.get("/", async (req, res) => {
  try {
    const challenges = await GroupChallenge.findAll({
      include: [
        {
          model: User,
          as: "participants",
          attributes: ["id", "name", "email"],
          through: { attributes: ["status", "role", "invited_by"] },
        },
        { model: User, as: "creator", attributes: ["id", "name", "email"] },
      ],
      order: [["created_at", "DESC"]],
    });

    res.json(challenges);
  } catch (err) {
    console.error("Failed to fetch challenges", err);
    res.status(500).json({ error: "Failed to fetch challenges" });
  }
});

// Create a new challenge and optionally invite friends
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      creatorId,
      requiresApproval = false,
      invites = [],
    } = req.body;

    if (!title || !creatorId || !startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "title, creatorId, startDate, and endDate are required" });
    }

    const challenge = await GroupChallenge.create({
      title,
      description,
      start_date: startDate,
      end_date: endDate,
      creator_id: creatorId,
      approval_required: !!requiresApproval,
    });

    // Creator automatically joins as owner
    await UserGroupChallenge.create({
      user_id: creatorId,
      challenge_id: challenge.id,
      status: "accepted",
      role: "creator",
    });

    if (Array.isArray(invites) && invites.length > 0) {
      const inviteRows = invites.map((friendId) => ({
        user_id: friendId,
        challenge_id: challenge.id,
        status: "invited",
        role: "participant",
        invited_by: creatorId,
      }));

      await UserGroupChallenge.bulkCreate(inviteRows, { ignoreDuplicates: true });
    }

    const hydratedChallenge = await GroupChallenge.findByPk(challenge.id, {
      include: [
        {
          model: User,
          as: "participants",
          attributes: ["id", "name", "email"],
          through: { attributes: ["status", "role", "invited_by"] },
        },
        { model: User, as: "creator", attributes: ["id", "name", "email"] },
      ],
    });

    res.status(201).json(hydratedChallenge);
  } catch (err) {
    console.error("Failed to create challenge", err);
    res.status(500).json({ error: "Failed to create challenge" });
  }
});

// Join a challenge
router.post("/:challengeId/join", async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const challenge = await GroupChallenge.findByPk(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    const desiredStatus = challenge.approval_required ? "pending" : "accepted";

    const [membership, created] = await UserGroupChallenge.findOrCreate({
      where: { user_id: userId, challenge_id: challengeId },
      defaults: { status: desiredStatus, role: "participant" },
    });

    if (!created) {
      // Upgrade invited users who join an auto-join challenge
      if (challenge.approval_required && membership.status === "invited") {
        membership.status = "pending";
        await membership.save();
        return res.json({ message: "Join request sent for approval", status: "pending" });
      }
      if (!challenge.approval_required && membership.status === "invited") {
        membership.status = "accepted";
        await membership.save();
      }
      return res.json({ message: "Already joined", status: membership.status });
    }

    membership.status = desiredStatus;
    await membership.save();

    res.json({
      message:
        desiredStatus === "pending"
          ? "Join request sent for approval"
          : "Joined challenge",
      status: desiredStatus,
    });
  } catch (err) {
    console.error("Failed to join challenge", err);
    res.status(500).json({ error: "Failed to join challenge" });
  }
});

// Cancel a join request
router.delete("/:challengeId/join", async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const membership = await UserGroupChallenge.findOne({
      where: { user_id: userId, challenge_id: challengeId },
    });

    if (!membership) {
      return res.status(404).json({ error: "Join request not found" });
    }

    if (!["pending", "invited"].includes(membership.status)) {
      return res.status(400).json({ error: "Only pending requests can be canceled" });
    }

    await membership.destroy();

    res.json({ message: "Join request canceled" });
  } catch (err) {
    console.error("Failed to cancel join request", err);
    res.status(500).json({ error: "Failed to cancel join request" });
  }
});

// Approve or reject a pending request (creator only)
router.post("/:challengeId/requests/:userId/decision", async (req, res) => {
  try {
    const { challengeId, userId } = req.params;
    const { approverId, action } = req.body;

    if (!approverId || !action) {
      return res.status(400).json({ error: "approverId and action are required" });
    }

    const challenge = await GroupChallenge.findByPk(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    if (challenge.creator_id !== Number(approverId)) {
      return res.status(403).json({ error: "Only the creator can approve or reject requests" });
    }

    const membership = await UserGroupChallenge.findOne({
      where: { user_id: userId, challenge_id: challengeId },
    });

    if (!membership || membership.status !== "pending") {
      return res.status(404).json({ error: "Pending request not found" });
    }

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "action must be approve or reject" });
    }

    membership.status = action === "approve" ? "accepted" : "rejected";
    await membership.save();

    res.json({
      message: action === "approve" ? "Request approved" : "Request rejected",
      status: membership.status,
    });
  } catch (err) {
    console.error("Failed to process request decision", err);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// List chat messages for a challenge (participants only)
router.get("/:challengeId/messages", async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const challenge = await GroupChallenge.findByPk(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    const membership = await UserGroupChallenge.findOne({
      where: {
        challenge_id: challengeId,
        user_id: userId,
        status: "accepted",
      },
    });

    if (!membership) {
      return res.status(403).json({ error: "You must join this challenge to view chat" });
    }

    const messages = await GroupChallengeMessage.findAll({
      where: { challenge_id: challengeId },
      include: [{ model: User, as: "sender", attributes: ["id", "name", "email"] }],
      order: [["created_at", "ASC"]],
    });

    res.json(messages);
  } catch (err) {
    console.error("Failed to fetch challenge messages", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Post a new chat message to a challenge
router.post("/:challengeId/messages", async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { userId, content } = req.body;

    if (!userId || !content || !String(content).trim()) {
      return res
        .status(400)
        .json({ error: "userId and non-empty content are required" });
    }

    const challenge = await GroupChallenge.findByPk(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    const membership = await UserGroupChallenge.findOne({
      where: {
        challenge_id: challengeId,
        user_id: userId,
        status: "accepted",
      },
    });

    if (!membership) {
      return res.status(403).json({ error: "Join this challenge to participate in chat" });
    }

    const message = await GroupChallengeMessage.create({
      challenge_id: challengeId,
      sender_id: userId,
      content: String(content).trim(),
    });

    const populated = await GroupChallengeMessage.findByPk(message.id, {
      include: [{ model: User, as: "sender", attributes: ["id", "name", "email"] }],
    });

    res.status(201).json(populated);
  } catch (err) {
    console.error("Failed to post challenge message", err);
    res.status(500).json({ error: "Failed to post message" });
  }
});

export default router;
