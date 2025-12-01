import express from "express";
import {
  GroupChallenge,
  User,
  UserGroupChallenge,
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

export default router;
