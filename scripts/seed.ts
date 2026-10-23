import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runSeeds(): Promise<void> {
  const seedsDir = path.join(__dirname, "seeds");
  const files = fs.readdirSync(seedsDir).filter((file) => file.endsWith(".sql")).sort();

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "books_user",
    password: process.env.DB_PASSWORD ?? "book@123.",
    database: process.env.DB_NAME ?? "books_db",
    multipleStatements: true,
  });

  try {
    for (const file of files) {
      console.log(`[Seed] Applying seed: ${file}...`);
      const sql = fs.readFileSync(path.join(seedsDir, file), "utf8");
      await connection.query(sql);
      console.log(`[Seed] Seed applied successfully: ${file}`);
    }
    console.log("All seeds completed successfully.");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void runSeeds();
}
