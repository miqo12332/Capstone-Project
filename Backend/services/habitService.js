import Habit from "../models/Habit.js";

export async function createHabit(userId, habit) {
  const habitRecord = await Habit.create({
    user_id: userId,
    title: habit.title,
    description: habit.description,
    category: habit.category,
    is_daily_goal: Boolean(habit.isDailyGoal),
    target_reps: habit.targetReps ?? null,
  });
  return habitRecord.get({ plain: true });
}

export async function updateHabit(userId, habitId, updates) {
  const [count] = await Habit.update(
    {
      title: updates.title,
      description: updates.description,
      category: updates.category,
      is_daily_goal: updates.isDailyGoal,
      target_reps: updates.targetReps ?? null,
    },
    { where: { id: habitId, user_id: userId } }
  );
  return count > 0;
}

export async function deleteHabit(userId, habitId) {
  const deleted = await Habit.destroy({ where: { id: habitId, user_id: userId } });
  return deleted > 0;
}

export async function listHabits(userId) {
  const habits = await Habit.findAll({ where: { user_id: userId }, order: [["created_at", "ASC"]] });
  return habits.map((habit) => habit.get({ plain: true }));
}
