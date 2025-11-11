import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const Notification = sequelize.define(
  "Notification",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    title: {
      type: DataTypes.STRING(140),
      allowNull: false,
      defaultValue: "Habit reminder",
    },
    message: { type: DataTypes.TEXT, allowNull: false },
    type: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "general",
    },
    category: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "general",
    },
    priority: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "medium",
    },
    reference_id: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    metadata: { type: DataTypes.JSON, allowNull: true },
    scheduled_for: { type: DataTypes.DATE, allowNull: true },
    is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
    read_at: { type: DataTypes.DATE, allowNull: true },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    cta_label: { type: DataTypes.STRING(60), allowNull: true },
    cta_url: { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    tableName: "notifications",
    timestamps: false,
  }
);

export default Notification;