import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { DataTypes } from "sequelize";
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
import taskRoutes from "./routes/taskRoutes.js";
import avatarRoutes from "./routes/avatarRoutes.js";
import dailyChallengeRoutes from "./routes/dailyChallengeRoutes.js";
import smartSchedulerRoutes from "./routes/smartSchedulerRoutes.js";
import libraryRoutes from "./routes/libraryRoutes.js";
import aiChatRoutes from "./routes/aiChatRoutes.js";
import assistantRoutes from "./routes/assistantRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import aiRoutes from "./routes/ai.js";

// === Node path handling for ES modules ===
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// === Middlewares ===
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// === Health Check ===
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
app.use("/api/tasks", taskRoutes);
app.use("/api/avatar", avatarRoutes);
app.use("/api/daily-challenge", dailyChallengeRoutes);
app.use("/api/smart-scheduler", smartSchedulerRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/ai-chat", aiChatRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/messages", messageRoutes);
app.use("/ai", aiRoutes);

// === Global Error Handler ===
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// === START SERVER ===
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map(t =>
      typeof t === "string" ? t : t.tableName || t.table_name
    );

    const hasTable = (name) => tableNames.includes(name);

    // 🔥 CRITICAL FIX: drop legacy user_settings table
    if (hasTable("user_settings")) {
      await queryInterface.dropTable("user_settings");
      console.log("🧹 Dropped legacy user_settings table");
    }

    // ---- Generic orphan cleanup helper ----
    const cleanupOrphans = async (table, fkColumn, parentTable, parentColumn) => {
      if (!hasTable(table) || !hasTable(parentTable)) return;

      await sequelize.query(`
        DELETE FROM ${table}
        WHERE ${fkColumn} IS NOT NULL
        AND ${fkColumn} NOT IN (SELECT ${parentColumn} FROM ${parentTable});
      `);
    };

    // ---- Run orphan cleanups BEFORE sync ----
    await cleanupOrphans("assistant_memories", "user_id", "users", "id");
    await cleanupOrphans("calendar_events", "user_id", "users", "id");
    await cleanupOrphans("calendar_integrations", "user_id", "users", "id");
    await cleanupOrphans("notifications", "user_id", "users", "id");
    await cleanupOrphans("progress", "user_id", "users", "id");
    await cleanupOrphans("tasks", "user_id", "users", "id");
    await cleanupOrphans("habits", "user_id", "users", "id");
    await cleanupOrphans("friends", "user_id", "users", "id");
    await cleanupOrphans("friends", "friend_id", "users", "id");

    // ---- Ensure optional columns exist ----
    if (hasTable("users")) {
      const userDef = await queryInterface.describeTable("users");
      if (!userDef.avatar) {
        await queryInterface.addColumn("users", "avatar", {
          type: DataTypes.STRING(255),
          allowNull: true,
        });
      }
    }

    // ---- FINAL SAFE SYNC ----
    await sequelize.sync({ alter: true });

const PORT = process.env.PORT || 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});


  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
};

startServer();
