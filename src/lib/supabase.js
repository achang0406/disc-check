import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const dbSchema = import.meta.env.VITE_SUPABASE_DB_SCHEMA || "public";

let client;

export function isSupabaseConfigured() {
  return Boolean(url && anonKey);
}

export function getSupabaseDbSchema() {
  return dbSchema;
}

export function getSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  if (!client) {
    client = createClient(url, anonKey, {
      db: { schema: dbSchema },
    });
  }

  return client;
}
