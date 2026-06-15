import { APP_NAME } from "./app.js";

export const WELCOME_STORAGE_KEY = "disc_check_welcome_seen_v1";

export function getWelcomeSteps(groupCount) {
  const steps = [
    {
      id: "welcome",
      title: `Welcome to ${APP_NAME}`,
      body:
        "Rally your pickup group in one place — see upcoming games, RSVP, check in, and chat.",
    },
    {
      id: "groups",
      title: "Your groups",
      body: "Each card is a group. Open one to see its games and join the action.",
    },
  ];

  if (groupCount === 1) {
    steps.push({
      id: "single-group",
      title: "Tap your group",
      body:
        "First visit stays here on purpose. Tap your group below for a quick tour — next time we'll open it directly.",
    });
  } else if (groupCount > 1) {
    steps.push({
      id: "pick-group",
      title: "Pick a group",
      body: "Tap a group below to get started. If you ever have just one, we'll skip this page and open it directly.",
    });
  } else {
    steps.push({
      id: "no-groups",
      title: "Almost there",
      body: "When a group is added, it'll show up here.",
    });
  }

  return steps;
}
