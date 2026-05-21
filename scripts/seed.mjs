import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_GAMES } from "../src/constants/games.js";
import { deriveWeeklyAnchorUtc } from "../src/utils/gameSchedule.js";

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
  DEFAULT_GAMES.map((game) => {
    const startsAt = game.startsAt ?? deriveWeeklyAnchorUtc(game.time);
    if (!startsAt) {
      throw new Error(`Could not derive starts_at for game ${game.id} (${game.time})`);
    }

    return {
      id: game.id,
      name: game.name,
      location: game.location,
      city: game.city,
      time: game.time,
      starts_at: startsAt,
      type: game.type,
      target: game.target,
      status: game.status,
    };
  }),
  { onConflict: "id" },
);

if (error) {
  console.error("Seed failed:", error.message);
  process.exit(1);
}

console.log(`Seeded ${DEFAULT_GAMES.length} game(s).`);
