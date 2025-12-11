// routes/habitRoutes.js
import express from "express";
import {
  createHabit,
  getHabitsByUser,
  updateHabit,
  removeHabit,
  generateHabitSuggestion,
  rewriteHabit,
} from "../controllers/habitController.js";

const router = express.Router();

router.get("/", getHabitsByUser);
router.get("/user/:userId", getHabitsByUser);
router.post("/", createHabit);
router.post("/ai-suggest", generateHabitSuggestion);
router.post("/ai-rewrite", rewriteHabit);
router.put("/:id", updateHabit);
router.delete("/:id", removeHabit);

export default router;
