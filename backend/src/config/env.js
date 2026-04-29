require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 3001,
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_PORT: Number(process.env.DB_PORT || 5432),
  DB_NAME: process.env.DB_NAME || "sgp_rrhh",
  DB_USER: process.env.DB_USER || "postgres",
  DB_PASSWORD: process.env.DB_PASSWORD || "datos1234",
  DATABASE_URL: process.env.DATABASE_URL || null,
};
