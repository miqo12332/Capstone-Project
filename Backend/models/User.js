import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(200), allowNull: false },
    age: { type: DataTypes.INTEGER, allowNull: true },
    gender: { type: DataTypes.STRING(20), allowNull: true },
    bio: { type: DataTypes.TEXT, allowNull: true },
    avatar: { type: DataTypes.STRING(255), allowNull: true },
    primary_goal: { type: DataTypes.STRING(150), allowNull: true },
    focus_area: { type: DataTypes.STRING(120), allowNull: true },
    experience_level: { type: DataTypes.STRING(60), allowNull: true },
    daily_commitment: { type: DataTypes.STRING(60), allowNull: true },
    support_preference: { type: DataTypes.STRING(120), allowNull: true },
    motivation_statement: { type: DataTypes.TEXT, allowNull: true },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    verification_code: { type: DataTypes.STRING(10), allowNull: true },
    verification_expires: { type: DataTypes.DATE, allowNull: true },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "users",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default User;
