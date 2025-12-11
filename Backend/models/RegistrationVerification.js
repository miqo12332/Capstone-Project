import { DataTypes } from "sequelize";
import sequelize from "../sequelize.js";

const RegistrationVerification = sequelize.define(
  "RegistrationVerification",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    code_hash: { type: DataTypes.STRING(200), allowNull: false },
    payload: { type: DataTypes.JSONB, allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    tableName: "registration_verifications",
    timestamps: false,
  }
);

export default RegistrationVerification;
