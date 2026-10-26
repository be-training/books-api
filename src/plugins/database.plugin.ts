import "dotenv/config";
import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import mysql, { Pool, PoolOptions } from "mysql2/promise";

declare module "fastify" {
  interface FastifyInstance {
    db: Pool;
  }
}

const databasePlugin: FastifyPluginAsync = async (fastify) => {
  const poolConfig: PoolOptions = {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "books_user",
    password: process.env.DB_PASSWORD ?? "book@123.",
    database: process.env.DB_NAME ?? "books_db",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  };

  const pool: Pool = mysql.createPool(poolConfig);

  // Verify database connection using Fastify's structured logger (No console.log)
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    fastify.log.info("🚀 ~ Connected to MySQL database successfully");
  } catch (error) {
    fastify.log.error(error, "🚀 ~ Failed to connect to MySQL database");
    throw error;
  }

  // Decorate Fastify instance with database pool
  fastify.decorate("db", pool);

  // Fastify lifecycle hook: automatically close pool on server shutdown
  fastify.addHook("onClose", async (instance) => {
    instance.log.info("Closing MySQL database connection pool...");
    await pool.end();
  });
};

export default fp(databasePlugin, {
  name: "database",
});
