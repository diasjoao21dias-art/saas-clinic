import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Usar caminho absoluto para evitar problemas de diretório no Windows
const dbPath = path.resolve(__dirname, "..", "sqlite.db");
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
