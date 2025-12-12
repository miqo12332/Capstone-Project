import Task from "../models/Task.js";

const toNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const listTasksByUser = async (req, res, next) => {
  try {
    const userId = req.params.userId ?? req.query.user_id;

    if (!userId) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const tasks = await Task.findAll({
      where: { user_id: userId },
      order: [["created_at", "ASC"]],
    });

    return res.json(tasks);
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    const userId = req.body.user_id;
    const color = req.body.color?.trim() || null;
    const status = req.body.status?.trim() || "pending";

    if (!name || !userId) {
      return res.status(400).json({ error: "name and user_id are required" });
    }

    const allowedStatuses = ["pending", "done", "missed"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const task = await Task.create({
      user_id: userId,
      name,
      duration_minutes: toNumber(req.body.duration_minutes) ?? 60,
      min_duration_minutes: toNumber(req.body.min_duration_minutes),
      max_duration_minutes: toNumber(req.body.max_duration_minutes),
      split_up: Boolean(req.body.split_up),
      hours_label: req.body.hours_label?.trim() || null,
      schedule_after: toDate(req.body.schedule_after),
      due_date: toDate(req.body.due_date),
      color,
      status,
    });

    return res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

export const updateTaskStatus = async (req, res, next) => {
  try {
    const taskId = req.params.taskId;
    const status = req.body.status?.trim();
    const allowedStatuses = ["pending", "done", "missed"];

    if (!taskId) {
      return res.status(400).json({ error: "taskId is required" });
    }

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const task = await Task.findByPk(taskId);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    task.status = status;
    await task.save();

    return res.json(task);
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const taskId = req.params.taskId;

    if (!taskId) {
      return res.status(400).json({ error: "taskId is required" });
    }

    const task = await Task.findByPk(taskId);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    await task.destroy();

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};
