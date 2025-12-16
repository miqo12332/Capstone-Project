import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

const {
  DATABASE_URL,
  DB_HOST = "localhost",
  DB_PORT = "5432",
  DB_NAME,
  DB_USER,
  DB_PASS,
  DB_DIALECT = "postgres",
  DB_SSL,
} = process.env;

const sslEnabled =
  typeof DB_SSL === "string" &&
  ["true", "1", "yes", "required"].includes(DB_SSL.toLowerCase());

const baseOptions = {
  host: DB_HOST,
  port: Number(DB_PORT) || 5432,
  dialect: DB_DIALECT || "postgres",
  logging: false,
  dialectOptions: sslEnabled
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
};

const sequelize = DATABASE_URL
  ? new Sequelize(DATABASE_URL, { ...baseOptions, dialect: "postgres" })
  : new Sequelize(DB_NAME, DB_USER, DB_PASS, baseOptions);

export default sequelize;
