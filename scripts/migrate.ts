import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql, { RowDataPacket } from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MigrationRow extends RowDataPacket {
  version: string;
}

export async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "books_user",
    password: process.env.DB_PASSWORD ?? "book@123.",
    database: process.env.DB_NAME ?? "books_db",
    multipleStatements: true,
  });

  try {
    // 1. Create schema_migrations table to track applied migrations
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Fetch applied migrations
    const [rows] = await connection.query<MigrationRow[]>(
      "SELECT version FROM schema_migrations",
    );
    const appliedVersions = new Set(rows.map((row) => row.version));

    // 3. Run unapplied migrations
    for (const file of files) {
      if (appliedVersions.has(file)) {
        console.log(`[Migration] Already applied: ${file}`);
        continue;
      }

      console.log(`[Migration] Applying: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await connection.query(sql);
      await connection.query(
        "INSERT INTO schema_migrations (version) VALUES (?)",
        [file],
      );
      console.log(`[Migration] Applied successfully: ${file}`);
    }

    console.log("All migrations are up to date.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void runMigrations();
}
