// routes/habitRoutes.js
import express from "express";
import {
  createHabit,
  getHabitsByUser,
  removeHabit,
  updateHabit,
} from "../controllers/habitController.js";

const router = express.Router();

router.get("/", getHabitsByUser);
router.get("/user/:userId", getHabitsByUser);
router.post("/", createHabit);
router.patch("/:id", updateHabit);
router.delete("/:id", removeHabit);

export default router;
