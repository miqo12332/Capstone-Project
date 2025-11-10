// routes/habitRoutes.js
import express from "express";
import {
  createHabit,
  getHabitsByUser,
  removeHabit,
} from "../controllers/habitController.js";

const router = express.Router();

router.get("/user/:userId", getHabitsByUser);
router.post("/", createHabit);
router.delete("/:id", removeHabit);

export default router;
