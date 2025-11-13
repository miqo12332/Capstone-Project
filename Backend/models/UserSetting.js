import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const UserSetting = sequelize.define(
  "UserSetting",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    timezone: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: "UTC",
    },
    daily_reminder_time: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    weekly_summary_day: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "Sunday",
    },
    email_notifications: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    push_notifications: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    share_activity: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    theme: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "light",
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "user_settings",
    timestamps: false,
  }
);

export default UserSetting;
