import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const Habit = sequelize.define(
  "Habit",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    category: { type: DataTypes.STRING(50), allowNull: true },
    target_reps: { type: DataTypes.INTEGER, allowNull: true },
    is_daily_goal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "habits",
    timestamps: false, // ✅ disable createdAt/updatedAt
  }
);

export default Habit;