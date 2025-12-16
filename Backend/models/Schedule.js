// models/Schedule.js
import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const Schedule = sequelize.define(
  "Schedule",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    // your actual DB columns
    habit_id: { type: DataTypes.INTEGER, allowNull: false },

    user_id: { type: DataTypes.INTEGER, allowNull: false },

    day:       { type: DataTypes.DATEONLY, allowNull: false },
    starttime: { type: DataTypes.TIME, allowNull: false },
    endtime:   { type: DataTypes.TIME, allowNull: true },
    enddate:   { type: DataTypes.DATEONLY, allowNull: true },

    repeat:     { type: DataTypes.STRING(50), allowNull: false, defaultValue: "daily" },
    customdays: { type: DataTypes.STRING(100), allowNull: true },
    notes:      { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "schedules",
    // Map Sequelize's timestamps to your actual lowercase columns
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: false,
  }
);

export default Schedule;
