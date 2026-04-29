const { Pool } = require("pg");
const env = require("./env");

const pool = env.DATABASE_URL
  ? new Pool({
      connectionString: env.DATABASE_URL,
    })
  : new Pool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: String(env.DB_PASSWORD || ""),
    });

module.exports = pool;
