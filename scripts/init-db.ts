import "dotenv/config";
import { runMigrations } from "./migrate.js";
import { runSeeds } from "./seed.js";

async function main(): Promise<void> {
  console.log("🚀 ~ Starting Database Initialization");
  await runMigrations();
  await runSeeds();
  console.log("🚀 ~ Database Initialization Finished Successfully");
}

void main();
