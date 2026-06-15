import { APP_NAME } from "./app.js";

export const WELCOME_STORAGE_KEY = "disc_check_welcome_seen_v1";

export const WELCOME_TARGETS = {
  FIRST_GROUP: "welcome-first-group",
  INSTALL_LINK: "install-link",
};

const GROUP_CARD_SPOTLIGHT_PAD = 8;

const INSTALL_STEP = {
  id: "install",
  title: "Add to Home Screen",
  body:
    "Tap here to install as a full-screen app. Enable Game alerts inside a group for status updates.",
  target: WELCOME_TARGETS.INSTALL_LINK,
  spotlightPad: 4,
};

export function getWelcomeSteps(groupCount, { showInstallStep = false } = {}) {
  const steps = [
    {
      id: "welcome",
      title: `Welcome to ${APP_NAME}`,
      body:
        "Rally your pickup group in one place — see upcoming games, RSVP, check in, and chat.",
      centered: true,
    },
  ];

  if (groupCount === 0) {
    steps.push({
      id: "home-base",
      title: "Your home base",
      body: "This page lists your groups. When one is added, open it from here.",
      centered: true,
    });
  } else {
    steps.push({
      id: "groups",
      title: "Your groups",
      body: "Each card is a group. Open one to see its games and join the action.",
      target: WELCOME_TARGETS.FIRST_GROUP,
      spotlightPad: GROUP_CARD_SPOTLIGHT_PAD,
    });

    if (groupCount === 1) {
      steps.push({
        id: "single-group",
        title: "Tap your group",
        body:
          "First visit stays here on purpose. Tap your group below for a quick tour — next time we'll open it directly.",
        target: WELCOME_TARGETS.FIRST_GROUP,
        spotlightPad: GROUP_CARD_SPOTLIGHT_PAD,
      });
    } else {
      steps.push({
        id: "pick-group",
        title: "Pick a group",
        body: "Tap a group below to get started. If you ever have just one, we'll skip this page and open it directly.",
        target: WELCOME_TARGETS.FIRST_GROUP,
        spotlightPad: GROUP_CARD_SPOTLIGHT_PAD,
      });
    }
  }

  if (showInstallStep) {
    steps.push(INSTALL_STEP);
  }

  return steps;
}
