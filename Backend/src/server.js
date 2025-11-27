import dotenv from "dotenv";

import app from "./app.js";
import sequelize from "./config/db.js";
import "./models/index.js";

dotenv.config();

const PORT = process.env.PORT || 5001;

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

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
