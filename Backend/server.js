import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sequelize from "./sequelize.js";
import "./models/index.js";

// === Import Routes ===
import userRoutes from "./routes/userRoutes.js";
import habitRoutes from "./routes/habitRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import groupChallengeRoutes from "./routes/groupChallengeRoutes.js";
import achievementRoutes from "./routes/achievementRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import avatarRoutes from "./routes/avatarRoutes.js"; // ✅ new route
import dailyChallengeRoutes from "./routes/dailyChallengeRoutes.js";
import smartSchedulerRoutes from "./routes/smartSchedulerRoutes.js";

// === Node path handling for ES modules ===
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// === Middlewares ===
app.use(cors());
app.use(express.json());

// === Serve uploaded images ===
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// === Base Health Route ===
app.get("/", (req, res) => {
  res.send("✅ StepHabit Backend is Running...");
});

// === API Routes ===
app.use("/api/users", userRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/group-challenges", groupChallengeRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/avatar", avatarRoutes); // ✅ avatar upload route
app.use("/api/daily-challenge", dailyChallengeRoutes);
app.use("/api/smart-scheduler", smartSchedulerRoutes);

// === Global Error Handler ===
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// === Connect Database and Start Server ===
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

    // Ensure any new columns or tables introduced in the models are available
    // without requiring a manual migration step. This keeps features such as
    // user profile preferences in sync across environments where the schema
    // might have been created before these fields existed.
    await sequelize.sync({ alter: true });

    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
};

startServer();

