import express from "express";

import userRoutes from "../../routes/userRoutes.js";
import habitRoutes from "../../routes/habitRoutes.js";
import progressRoutes from "../../routes/progressRoutes.js";
import scheduleRoutes from "../../routes/scheduleRoutes.js";
import notificationRoutes from "../../routes/notificationRoutes.js";
import groupChallengeRoutes from "../../routes/groupChallengeRoutes.js";
import achievementRoutes from "../../routes/achievementRoutes.js";
import friendRoutes from "../../routes/friendRoutes.js";
import analyticsRoutes from "../../routes/analyticsRoutes.js";
import avatarRoutes from "../../routes/avatarRoutes.js";
import dailyChallengeRoutes from "../../routes/dailyChallengeRoutes.js";
import smartSchedulerRoutes from "../../routes/smartSchedulerRoutes.js";
import libraryRoutes from "../../routes/libraryRoutes.js";
import assistantRoutes from "../../routes/assistantRoutes.js";
import calendarRoutes from "../../routes/calendarRoutes.js";
import messageRoutes from "../../routes/messageRoutes.js";

const router = express.Router();

router.use("/users", userRoutes);
router.use("/habits", habitRoutes);
router.use("/progress", progressRoutes);
router.use("/schedules", scheduleRoutes);
router.use("/notifications", notificationRoutes);
router.use("/group-challenges", groupChallengeRoutes);
router.use("/achievements", achievementRoutes);
router.use("/friends", friendRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/avatar", avatarRoutes);
router.use("/daily-challenge", dailyChallengeRoutes);
router.use("/smart-scheduler", smartSchedulerRoutes);
router.use("/library", libraryRoutes);
router.use("/assistant", assistantRoutes);
router.use("/calendar", calendarRoutes);
router.use("/messages", messageRoutes);

export default router;
