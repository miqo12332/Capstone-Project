import { DataTypes } from "sequelize"
import sequelize from "../sequelize.js"

const PasswordReset = sequelize.define(
  "PasswordReset",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    code_hash: { type: DataTypes.STRING(200), allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    tableName: "password_resets",
    timestamps: false,
  }
)

export default PasswordReset
