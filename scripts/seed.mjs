import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { SEED_GAMES, SEED_GROUPS } from "./seed-data.mjs";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const passcodeOverride = process.env.GROUP_ADMIN_PASSCODE || process.env.VITE_ADMIN_PASSCODE;

const groupsResult = await supabase.from("groups").upsert(
  SEED_GROUPS.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description ?? null,
    admin_passcode: passcodeOverride || group.adminPasscode,
  })),
  { onConflict: "id" },
);

if (groupsResult.error) {
  console.error("Group seed failed:", groupsResult.error.message);
  process.exit(1);
}

const { error } = await supabase.from("games").upsert(
  SEED_GAMES.map((game) => ({
    id: game.id,
    group_id: game.groupId,
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

console.log(`Seeded ${SEED_GROUPS.length} group(s) and ${SEED_GAMES.length} game(s).`);
