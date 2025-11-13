import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const AssistantMemory = sequelize.define(
  "AssistantMemory",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    role: { type: DataTypes.STRING(20), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    keywords: { type: DataTypes.JSON, allowNull: true },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "assistant_memories",
    timestamps: false,
  }
);

export default AssistantMemory;
