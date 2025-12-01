import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const GroupChallenge = sequelize.define(
  "GroupChallenge",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    creator_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    approval_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "group_challenges", // ✅ exact DB table name
    timestamps: false, // 🚫 no createdAt/updatedAt
  }
);

export default GroupChallenge;
