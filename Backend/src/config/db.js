import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const {
  DB_NAME = "postgres",
  DB_USER = "postgres",
  DB_PASS = "",
  DB_HOST = "localhost",
  DB_PORT = 5432,
  DB_LOGGING = "false",
} = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: Number(DB_PORT),
  dialect: "postgres",
  logging: DB_LOGGING === "true" ? console.log : false,
  define: {
    underscored: true,
  },
});

export default sequelize;
