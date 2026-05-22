import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { SEED_GAMES } from "./seed-data.mjs";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const { error } = await supabase.from("games").upsert(
  SEED_GAMES.map((game) => ({
    id: game.id,
    name: game.name,
    location: game.location,
    address: game.address ?? null,
    weekday: game.weekday,
    start_time: game.startTime,
    timezone: game.timezone,
    type: game.type,
    target: game.target,
    status: game.status,
  })),
  { onConflict: "id" },
);

if (error) {
  console.error("Seed failed:", error.message);
  process.exit(1);
}

const adminPasscode = process.env.VITE_ADMIN_PASSCODE || process.env.ADMIN_PASSCODE;
if (adminPasscode) {
  const configResult = await supabase.from("app_config").upsert(
    { key: "admin_passcode", value: adminPasscode },
    { onConflict: "key" },
  );
  if (configResult.error) {
    console.error("Admin passcode seed failed:", configResult.error.message);
    process.exit(1);
  }
  console.log("Seeded admin passcode.");
}

console.log(`Seeded ${SEED_GAMES.length} game(s).`);
