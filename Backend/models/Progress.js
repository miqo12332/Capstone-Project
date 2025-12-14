import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const Progress = sequelize.define(
  "Progress",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    habit_id: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING(50), allowNull: false }, // completed, missed, skipped
    reflected_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    progress_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "progress",
    timestamps: false,
  }
);

export default Progress;