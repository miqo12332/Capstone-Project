import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const CalendarEvent = sequelize.define(
  "CalendarEvent",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    integration_id: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(160), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    location: { type: DataTypes.STRING(200), allowNull: true },
    start_time: { type: DataTypes.DATE, allowNull: false },
    end_time: { type: DataTypes.DATE, allowNull: true },
    timezone: { type: DataTypes.STRING(60), allowNull: true },
    all_day: { type: DataTypes.BOOLEAN, defaultValue: false },
    source: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "calendar" },
    external_event_id: { type: DataTypes.STRING(160), allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "calendar_events",
    timestamps: false,
  }
);

export default CalendarEvent;
