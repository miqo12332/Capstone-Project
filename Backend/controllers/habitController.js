import Habit from "../models/Habit.js";

export const getHabitsByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const habits = await Habit.findAll({ where: { user_id: userId }, order: [["created_at", "ASC"]] });
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
