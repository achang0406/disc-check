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
      title: "Starting on this page",
      body:
        "You have one group, so we normally open it automatically.\n\nOn this first visit we're staying here so you can read this intro. Tap your group below when you're ready — you'll get a quick tour inside.\n\nNext time you visit, we'll take you straight to your group.",
    });
  } else if (groupCount > 1) {
    steps.push({
      id: "pick-group",
      title: "Pick a group",
      body: "Tap any group below to see its games. If you ever have just one group, we'll skip this page on future visits and open it directly.",
    });
  } else {
    steps.push({
      id: "no-groups",
      title: "Almost there",
      body: "When your organizer adds a group, it'll show up here. Open it to RSVP, check in, and chat.",
    });
  }

  return steps;
}
