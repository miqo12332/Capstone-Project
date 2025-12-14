import express from "express";
import { Op } from "sequelize";
import { Friend, Habit, User } from "../models/index.js";

const router = express.Router();

const serializeFriend = (friendUser, overrides = {}) => {
  const habitsSource = overrides.habits ?? friendUser.habits;

  return {
    id: friendUser.id,
    name: friendUser.name,
    email: friendUser.email,
    avatar: friendUser.avatar,
    status: friendUser.Friend?.status ?? "accepted",
    created_at: overrides.created_at ?? friendUser.Friend?.created_at ?? null,
    shares_habits_with_me: overrides.shares_habits_with_me ?? false,
    can_view_my_habits: overrides.can_view_my_habits ?? false,
    habits: Array.isArray(habitsSource)
      ? habitsSource.map((habit) => ({
          id: habit.id,
          title: habit.title,
          category: habit.category,
          description: habit.description,
        }))
      : [],
  };
};

// Fetch the current friends for a user, including their shared habits
router.get("/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId, { attributes: ["id"] });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const friendships = await Friend.findAll({
      where: { user_id: userId, status: "accepted" },
      attributes: ["friend_id", "created_at", "share_habits"],
    });

    const friendIds = friendships.map((friendship) => friendship.friend_id);
    if (friendIds.length === 0) {
      return res.json([]);
    }

    const reverseSharing = await Friend.findAll({
      where: { user_id: { [Op.in]: friendIds }, friend_id: userId, status: "accepted" },
      attributes: ["user_id", "share_habits"],
    });

    const reverseSharingMap = new Map(
      reverseSharing.map((relation) => [relation.user_id, relation.share_habits])
    );
    const friendshipMap = new Map(
      friendships.map((relation) => [relation.friend_id, relation])
    );

    const friends = await User.findAll({
      where: { id: { [Op.in]: friendIds } },
      attributes: ["id", "name", "email", "avatar"],
      include: [
        {
          model: Habit,
          as: "habits",
          attributes: ["id", "title", "category", "description"],
        },
      ],
    });

    const serialized = friends.map((friendUser) => {
      const relation = friendshipMap.get(friendUser.id);
      const sharesHabitsWithMe = reverseSharingMap.get(friendUser.id) ?? false;

      return serializeFriend(friendUser, {
        created_at: relation?.created_at ?? null,
        shares_habits_with_me: sharesHabitsWithMe,
        can_view_my_habits: relation?.share_habits ?? false,
        habits: sharesHabitsWithMe ? friendUser.habits : [],
      });
    });

    res.json(serialized);
  } catch (err) {
    next(err);
  }
});

// Search for new people to add as friends
router.get("/:userId/search", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const query = (req.query.q || "").trim();

    const user = await User.findByPk(userId, { attributes: ["id"] });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const friendships = await Friend.findAll({
      where: {
        [Op.or]: [{ user_id: userId }, { friend_id: userId }],
      },
      attributes: ["user_id", "friend_id"],
    });

    const excludedIds = new Set([Number(userId)]);
    friendships.forEach((friendship) => {
      excludedIds.add(Number(friendship.user_id));
      excludedIds.add(Number(friendship.friend_id));
    });

    const nameOrEmailFilter = query
      ? {
          [Op.or]: [
            { name: { [Op.iLike]: `${query}%` } },
            { email: { [Op.iLike]: `${query}%` } },
          ],
        }
      : {};

    const potentialFriends = await User.findAll({
      attributes: ["id", "name", "email", "avatar"],
      where: {
        id: { [Op.notIn]: Array.from(excludedIds) },
        ...nameOrEmailFilter,
      },
      order: [["name", "ASC"]],
      limit: 10,
    });

    res.json(potentialFriends);
  } catch (err) {
    next(err);
  }
});

// Pending friend requests for the current user
router.get("/:userId/requests", async (req, res, next) => {
  try {
    const { userId } = req.params;

    const requests = await Friend.findAll({
      where: { friend_id: userId, status: "pending" },
      include: [
        {
          model: User,
          as: "requester",
          attributes: ["id", "name", "email", "avatar"],
        },
      ],
      attributes: ["id", "user_id", "created_at"],
      order: [["created_at", "DESC"]],
    });

    const serialized = requests.map((request) => ({
      id: request.id,
      created_at: request.created_at,
      requester: request.requester,
    }));

    res.json(serialized);
  } catch (err) {
    next(err);
  }
});

// Send a friend request
router.post("/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ error: "friendId is required" });
    }

    if (Number(userId) === Number(friendId)) {
      return res.status(400).json({ error: "You cannot add yourself as a friend" });
    }

    const [user, friend] = await Promise.all([
      User.findByPk(userId, { attributes: ["id", "name"] }),
      User.findByPk(friendId, { attributes: ["id", "name", "email", "avatar"] }),
    ]);

    if (!user || !friend) {
      return res.status(404).json({ error: "User not found" });
    }

    const existing = await Friend.findOne({ where: { user_id: userId, friend_id: friendId } });
    if (existing) {
      if (existing.status === "pending") {
        return res.status(400).json({ error: "Friend request already sent" });
      }

      if (existing.status === "accepted") {
        return res.status(400).json({ error: "You are already friends" });
      }

      existing.status = "pending";
      existing.share_habits = true;
      await existing.save();
      return res.status(200).json({ message: "Friend request re-sent" });
    }

    await Friend.create({
      user_id: userId,
      friend_id: friendId,
      status: "pending",
      share_habits: true,
    });

    res.status(201).json({
      message: `Friend request sent to ${friend.name}`,
    });
  } catch (err) {
    next(err);
  }
});

// Accept or reject a pending friend request
router.post("/:userId/respond", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { requesterId, action } = req.body;

    if (!requesterId || !["accept", "reject"].includes(action)) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const request = await Friend.findOne({
      where: { user_id: requesterId, friend_id: userId },
    });

    if (!request || request.status !== "pending") {
      return res.status(404).json({ error: "No pending request found" });
    }

    if (action === "reject") {
      request.status = "rejected";
      await request.save();
      return res.json({ message: "Friend request rejected" });
    }

    request.status = "accepted";
    request.share_habits = true;
    await request.save();

    const [reverse] = await Friend.findOrCreate({
      where: { user_id: userId, friend_id: requesterId },
      defaults: { status: "accepted", share_habits: true },
    });

    if (reverse.status !== "accepted") {
      reverse.status = "accepted";
      reverse.share_habits = true;
      await reverse.save();
    }

    const friend = await User.findByPk(requesterId, {
      attributes: ["id", "name", "email", "avatar"],
      include: [
        {
          model: Habit,
          as: "habits",
          attributes: ["id", "title", "category", "description"],
        },
      ],
    });

    return res.json(
      serializeFriend(friend, {
        created_at: request.created_at,
        shares_habits_with_me: true,
        can_view_my_habits: reverse.share_habits,
      })
    );
  } catch (err) {
    next(err);
  }
});

// Update habit visibility for a friend
router.patch("/:userId/visibility", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { friendId, shareHabits } = req.body;

    if (typeof shareHabits !== "boolean" || !friendId) {
      return res.status(400).json({ error: "friendId and shareHabits are required" });
    }

    const friendship = await Friend.findOne({
      where: { user_id: userId, friend_id: friendId, status: "accepted" },
    });

    if (!friendship) {
      return res.status(404).json({ error: "Friendship not found" });
    }

    friendship.share_habits = shareHabits;
    await friendship.save();

    res.json({ message: "Visibility updated" });
  } catch (err) {
    next(err);
  }
});

export default router;