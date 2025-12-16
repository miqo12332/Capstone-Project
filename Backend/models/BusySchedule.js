// models/BusySchedule.js
import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const BusySchedule = sequelize.define(
  "BusySchedule",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    // Link to the user who created the busy event
    user_id: { type: DataTypes.INTEGER, allowNull: false },

    // Event metadata
    title: { type: DataTypes.STRING(255), allowNull: false },
    day: { type: DataTypes.DATEONLY, allowNull: false },
    starttime: { type: DataTypes.TIME, allowNull: false },
    endtime: { type: DataTypes.TIME, allowNull: true },
    enddate: { type: DataTypes.DATEONLY, allowNull: true },
    repeat: { type: DataTypes.STRING(50), allowNull: false, defaultValue: "daily" },
    customdays: { type: DataTypes.STRING(100), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "busy_schedules",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: false,
  }
);

export default BusySchedule;
