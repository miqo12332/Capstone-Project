import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Habit = sequelize.define(
  "Habit",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    category: { type: DataTypes.STRING(50), allowNull: true },
    is_public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "habits",
    underscored: true,
    timestamps: false,
    defaultScope: {
      order: [["created_at", "DESC"]],
    },
    scopes: {
      publicOnly: {
        where: { is_public: true },
      },
    },
  }
);

export default Habit;
