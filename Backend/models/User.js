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
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "users",
    timestamps: false, // ✅ prevents Sequelize from looking for createdAt/updatedAt
  }
);

export default User;