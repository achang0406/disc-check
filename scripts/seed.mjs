import dotenv from "dotenv";
import { SEED_GAMES, SEED_GROUPS } from "./seed-data.mjs";
import { createServiceClient } from "./supabase-client.mjs";

const REMOVED_TEST_GROUP_ID = "test";
const REMOVED_TEST_GAME_IDS = [
  "g-test",
  "g-test-1",
  "g-test-2",
  "g-test-3",
  "g-test-4",
  "g-test-5",
];

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabase = createServiceClient();

const passcodeOverride = process.env.GROUP_ADMIN_PASSCODE || process.env.VITE_ADMIN_PASSCODE;
const defaultGroupId = SEED_GROUPS[0]?.id ?? "default";

async function cleanup() {
  const { error: chatError, count: chatCount } = await supabase
    .from("group_chat_messages")
    .delete({ count: "exact" })
    .eq("group_id", defaultGroupId);

  if (chatError) {
    console.error("Clearing group chat failed:", chatError.message);
    process.exit(1);
  }

  const { error: gamesError } = await supabase
    .from("games")
    .delete()
    .in("id", REMOVED_TEST_GAME_IDS);

  if (gamesError) {
    console.error("Removing test games failed:", gamesError.message);
    process.exit(1);
  }

  const { error: groupError } = await supabase
    .from("groups")
    .delete()
    .eq("id", REMOVED_TEST_GROUP_ID);

  if (groupError) {
    console.error("Removing test group failed:", groupError.message);
    process.exit(1);
  }

  console.log(
    `Removed test group "${REMOVED_TEST_GROUP_ID}", ${REMOVED_TEST_GAME_IDS.length} test game id(s), and ${chatCount ?? 0} chat message(s) from "${defaultGroupId}".`,
  );
}

await cleanup();

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
