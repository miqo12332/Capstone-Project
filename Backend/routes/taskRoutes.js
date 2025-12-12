import express from "express";
import {
  createTask,
  deleteTask,
  listTasksByUser,
  updateTaskStatus,
} from "../controllers/taskController.js";

const router = express.Router();

router.get("/", listTasksByUser);
router.get("/user/:userId", listTasksByUser);
router.post("/", createTask);
router.patch("/:taskId/status", updateTaskStatus);
router.delete("/:taskId", deleteTask);

export default router;
