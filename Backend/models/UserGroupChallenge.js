import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const UserGroupChallenge = sequelize.define(
  "UserGroupChallenge",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    challenge_id: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "accepted",
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "participant",
    },
    invited_by: { type: DataTypes.INTEGER, allowNull: true },
    joined_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "user_group_challenges",
    timestamps: false,
  }
);

export default UserGroupChallenge;
