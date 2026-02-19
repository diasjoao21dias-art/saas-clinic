import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_DB_URL must be set.",
  );
}

export const pool = new Pool({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});
export const db = drizzle(pool, { schema });
