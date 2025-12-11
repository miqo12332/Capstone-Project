import Habit from "../models/Habit.js";
import Progress from "../models/Progress.js";
import Schedule from "../models/Schedule.js";
import { generateHabitPlan, rewriteHabitIdea } from "../services/habitIdeaService.js";

export const getHabitsByUser = async (req, res, next) => {
  try {
    const userId = req.params.userId ?? req.query.user_id;

    if (!userId) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const habits = await Habit.findAll({
      where: { user_id: userId },
      order: [["created_at", "ASC"]],
    });
    res.json(habits);
  } catch (error) {
    next(error);
  }
};

export const createHabit = async (req, res, next) => {
  try {
    const title = req.body.title?.trim() || req.body.name?.trim();
    const { user_id } = req.body;

    if (!title || !user_id) {
      return res.status(400).json({ error: "title and user_id are required" });
    }

    const payload = {
      title,
      user_id,
      description: req.body.description?.trim() || null,
      category: req.body.category?.trim() || null,
      target_reps:
        typeof req.body.target_reps === "number"
          ? req.body.target_reps
          : req.body.target_reps
          ? Number(req.body.target_reps)
          : null,
      is_daily_goal: Boolean(req.body.is_daily_goal),
    };

    const habit = await Habit.create(payload);
    res.status(201).json(habit);
  } catch (error) {
    next(error);
  }
};

export const generateHabitSuggestion = async (req, res, next) => {
  try {
    const title = req.body.title?.trim();

    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }

    const plan = await generateHabitPlan(title);

    return res.json(plan);
  } catch (error) {
    next(error);
  }
};

export const rewriteHabit = async (req, res, next) => {
  try {
    const message = req.body.input?.trim() || req.body.text?.trim() || req.body.idea?.trim();

    if (!message) {
      return res.status(400).json({ error: "input is required" });
    }

    const rewritten = await rewriteHabitIdea(message);

    return res.json(rewritten);
  } catch (error) {
    next(error);
  }
};

export const updateHabit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const habit = await Habit.findByPk(id);

    if (!habit) {
      return res.status(404).json({ error: "Habit not found" });
    }

    const updates = (({
      title,
      description,
      category,
      target_reps,
      is_daily_goal,
    }) => ({ title, description, category, target_reps, is_daily_goal }))(req.body);

    Object.entries(updates).forEach(([key, value]) => {
      if (typeof value !== "undefined") {
        habit[key] = value;
      }
    });

    await habit.save();
    res.json(habit);
  } catch (error) {
    next(error);
  }
};

export const removeHabit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const habit = await Habit.findByPk(id);

    if (!habit) {
      return res.status(404).json({ error: "Habit not found" });
    }

    await Progress.destroy({ where: { habit_id: id } });
    await Schedule.destroy({ where: { habit_id: id } });
    await habit.destroy();
    res.json({ message: "Habit deleted successfully" });
  } catch (error) {
    next(error);
  }
};
