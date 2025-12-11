import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const EmailVerification = sequelize.define(
  "EmailVerification",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING(150), allowNull: false },
    code: { type: DataTypes.STRING(6), allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "email_verifications",
    timestamps: false,
  }
);

export default EmailVerification;
