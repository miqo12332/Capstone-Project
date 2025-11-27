import dotenv from "dotenv";

import app from "./app.js";
import sequelize from "./config/db.js";
import "./models/index.js";

dotenv.config();

const PORT = process.env.PORT || 5001;

const cleanupOrphanedUserRelations = async () => {
  // Remove records pointing to users that no longer exist so that new foreign key
  // constraints can be applied without failing the migration.
  await sequelize.query(
    `DELETE FROM user_settings WHERE NOT EXISTS (SELECT 1 FROM users WHERE users.id = user_settings.user_id);`
  );

  await sequelize.query(
    `DELETE FROM assistant_memories WHERE NOT EXISTS (SELECT 1 FROM users WHERE users.id = assistant_memories.user_id);`
  );
};

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

    await cleanupOrphanedUserRelations();
    await sequelize.sync({ alter: true });

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
};

start();
