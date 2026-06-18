import { createClient } from "@supabase/supabase-js";

export function getSupabaseDbSchema() {
  return (
    process.env.VITE_SUPABASE_DB_SCHEMA ||
    process.env.SUPABASE_DB_SCHEMA ||
    "public"
  );
}

export function createServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const schema = getSupabaseDbSchema();

  if (!url || !serviceKey) {
    throw new Error(
      "Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  return createClient(url, serviceKey, {
    db: { schema },
  });
}
