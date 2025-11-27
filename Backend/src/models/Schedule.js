import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Schedule = sequelize.define(
  "Schedule",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    habit_id: { type: DataTypes.INTEGER, allowNull: true },
    userid: { type: DataTypes.INTEGER, allowNull: false },
    day: { type: DataTypes.DATEONLY, allowNull: false },
    starttime: { type: DataTypes.TIME, allowNull: false },
    endtime: { type: DataTypes.TIME, allowNull: true },
    enddate: { type: DataTypes.DATEONLY, allowNull: true },
    repeat: { type: DataTypes.STRING(50), allowNull: false, defaultValue: "daily" },
    customdays: { type: DataTypes.STRING(100), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "schedules",
    timestamps: true,
    createdAt: "createdat",
    updatedAt: "updatedat",
    underscored: false,
    indexes: [
      { fields: ["userid"] },
      { fields: ["habit_id"] },
    ],
  }
);

export default Schedule;
