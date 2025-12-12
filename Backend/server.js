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
import avatarRoutes from "./routes/avatarRoutes.js"; // ✅ new route
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
app.use("/api/tasks", taskRoutes);
app.use("/api/avatar", avatarRoutes); // ✅ avatar upload route
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

// === Connect Database and Start Server ===
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

    // Clean up legacy data that can violate new foreign key constraints when
    // `sequelize.sync({ alter: true })` attempts to add them. Without this, an
    // orphaned record in `user_settings` (left over from older schemas) causes
    // Postgres to reject the migration with `SequelizeForeignKeyConstraintError`.
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((table) =>
      typeof table === "string" ? table : table.tableName || table.table_name
    );
    const hasTable = (name) => tableNames.includes(name);

    const cleanupOrphans = async (table, fkColumn, parentTable, parentColumn) => {
      if (!hasTable(table) || !hasTable(parentTable)) return;

      await sequelize.query(`
        DELETE FROM ${table}
        WHERE ${fkColumn} IS NOT NULL
        AND ${fkColumn} NOT IN (SELECT ${parentColumn} FROM ${parentTable});
      `);
    };

    const ensureColumnExists = async (tableName, columnName, definition) => {
      if (!hasTable(tableName)) return;

      const tableDefinition = await queryInterface.describeTable(tableName);
      if (!tableDefinition[columnName]) {
        await queryInterface.addColumn(tableName, columnName, definition);
      }
    };

    await cleanupOrphans("user_settings", "user_id", "users", "id");
    await cleanupOrphans("assistant_memories", "user_id", "users", "id");
    await cleanupOrphans(
      "group_challenge_messages",
      "challenge_id",
      "group_challenges",
      "id"
    );
    await cleanupOrphans(
      "group_challenge_messages",
      "sender_id",
      "users",
      "id"
    );

    await ensureColumnExists("users", "avatar", {
      type: DataTypes.STRING(255),
      allowNull: true,
    });

    if (hasTable("users") && hasTable("assistant_memories")) {
      await sequelize.query(`
        DELETE FROM assistant_memories
        WHERE user_id IS NOT NULL
        AND user_id NOT IN (SELECT id FROM users);
      `);
    }


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

