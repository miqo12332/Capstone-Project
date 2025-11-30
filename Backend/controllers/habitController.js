import Habit from "../models/Habit.js";

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
    const { title, user_id } = req.body;

    if (!title || !user_id) {
      return res.status(400).json({ error: "title and user_id are required" });
    }

    const habit = await Habit.create(req.body);
    res.status(201).json(habit);
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

    await habit.destroy();
    res.json({ message: "Habit deleted successfully" });
  } catch (error) {
    next(error);
  }
};
