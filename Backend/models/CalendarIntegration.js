import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const CalendarIntegration = sequelize.define(
  "CalendarIntegration",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    provider: { type: DataTypes.STRING(30), allowNull: false },
    label: { type: DataTypes.STRING(120), allowNull: false },
    source_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "manual" },
    source_url: { type: DataTypes.STRING(255), allowNull: true },
    external_id: { type: DataTypes.STRING(120), allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    last_synced_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "calendar_integrations",
    timestamps: false,
  }
);

export default CalendarIntegration;
