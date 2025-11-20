import express from "express";
import { Op } from "sequelize";
import { Friend, Habit, Progress, User } from "../models/index.js";
import sequelize from "../sequelize.js";

const router = express.Router();

const serializeFriend = (friendUser, habitStats, overrides = {}) => ({
  id: friendUser.id,
  name: friendUser.name,
  email: friendUser.email,
  avatar: friendUser.avatar,
  status: friendUser.Friend?.status ?? "accepted",
  created_at: overrides.created_at ?? friendUser.Friend?.created_at ?? null,
  habits: Array.isArray(friendUser.habits)
    ? friendUser.habits.map((habit) => {
        const counts = habitStats[habit.id] ?? { done: 0, missed: 0 };
        const total = counts.done + counts.missed;

        return {
          id: habit.id,
          title: habit.title,
          category: habit.category,
          description: habit.description,
          completionRate: total > 0 ? Math.round((counts.done / total) * 100) : null,
          stats: counts,
        };
      })
    : [],
});

// Fetch the current friends for a user, including their shared habits
router.get("/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId, {
      attributes: ["id"],
      include: [
        {
          model: User,
          as: "friends",
          attributes: ["id", "name", "email", "avatar"],
          through: {
            attributes: ["status", "created_at"],
            where: { status: "accepted" },
          },
          include: [
            {
              model: Habit,
              as: "habits",
              attributes: ["id", "title", "category", "description", "is_public"],
              where: { is_public: true },
              required: false,
            },
          ],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const publicHabitIds = user.friends?.flatMap((f) =>
      (f.habits || []).map((h) => h.id)
    );

    let habitStats = {};

    if (publicHabitIds && publicHabitIds.length > 0) {
      const rows = await Progress.findAll({
        attributes: [
          "habit_id",
          "status",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        where: { habit_id: publicHabitIds },
        group: ["habit_id", "status"],
      });

      habitStats = rows.reduce((acc, row) => {
        const hid = Number(row.habit_id);
        const status = row.status;
        const count = Number(row.get("count"));

        if (!acc[hid]) {
          acc[hid] = { done: 0, missed: 0 };
        }

        if (status === "done") acc[hid].done += count;
        if (status === "missed") acc[hid].missed += count;

        return acc;
      }, {});
    }

    const friends = user.friends?.map((friend) => serializeFriend(friend, habitStats)) ?? [];
    res.json(friends);
  } catch (err) {
    next(err);
  }
});

// Search for new people to add as friends
router.get("/:userId/search", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const query = (req.query.q || "").trim();

    if (!query) {
      return res.json([]);
    }

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

    const potentialFriends = await User.findAll({
      attributes: ["id", "name", "email", "avatar"],
      where: {
        id: { [Op.notIn]: Array.from(excludedIds) },
        [Op.or]: [
          { name: { [Op.substring]: query } },
          { email: { [Op.substring]: query } },
        ],
      },
      order: [["name", "ASC"]],
      limit: 10,
    });

    res.json(potentialFriends);
  } catch (err) {
    next(err);
  }
});

// Add a new friend connection (auto-accept for now)
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
      User.findByPk(userId, { attributes: ["id"] }),
      User.findByPk(friendId, {
        attributes: ["id", "name", "email", "avatar"],
        include: [
          {
            model: Habit,
            as: "habits",
            attributes: [
              "id",
              "title",
              "category",
              "description",
              "is_public",
            ],
            where: { is_public: true },
            required: false,
          },
        ],
      }),
    ]);

    if (!user || !friend) {
      return res.status(404).json({ error: "User not found" });
    }

    const [forward] = await Friend.findOrCreate({
      where: { user_id: userId, friend_id: friendId },
      defaults: { status: "accepted" },
    });

    if (forward.status !== "accepted") {
      forward.status = "accepted";
      await forward.save();
    }

    const [reverse] = await Friend.findOrCreate({
      where: { user_id: friendId, friend_id: userId },
      defaults: { status: "accepted" },
    });

    if (reverse.status !== "accepted") {
      reverse.status = "accepted";
      await reverse.save();
    }

    const relation = await Friend.findOne({
      where: { user_id: userId, friend_id: friendId },
      attributes: ["created_at"],
    });

    res
      .status(201)
      .json(serializeFriend(friend, {}, { created_at: relation?.created_at ?? null }));
  } catch (err) {
    next(err);
  }
});

export default router;
