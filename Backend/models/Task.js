import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const Task = sequelize.define(
  "Task",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
    },
    min_duration_minutes: { type: DataTypes.INTEGER, allowNull: true },
    max_duration_minutes: { type: DataTypes.INTEGER, allowNull: true },
    split_up: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    hours_label: { type: DataTypes.STRING(120), allowNull: true },
    schedule_after: { type: DataTypes.DATE, allowNull: true },
    due_date: { type: DataTypes.DATE, allowNull: true },
    color: { type: DataTypes.STRING(20), allowNull: true },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "tasks",
    timestamps: false,
  }
);

export default Task;
