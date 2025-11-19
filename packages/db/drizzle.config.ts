import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
  migrations: {
    prefix: "timestamp",
  },
  casing: "snake_case",
  verbose: true,
  strict: true,
});
