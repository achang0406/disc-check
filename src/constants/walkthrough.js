export const WALKTHROUGH_STORAGE_KEY = "disc_check_group_walkthrough_v1";

export const WALKTHROUGH_TARGETS = {
  GAME_CARD: "game-card",
  WALK_INS: "walk-ins",
  CHAT_BAR: "chat-bar",
  GAME_STATUS: "game-status",
};

export const WALKTHROUGH_STEPS = [
  {
    id: "game-card",
    title: "How a game works",
    body:
      "Tap Count me in during pregame to RSVP. Hit the target headcount and you've got a game.\n\nWhen it's time to play, tap I'm here to check in and show you're ready.",
    target: WALKTHROUGH_TARGETS.GAME_CARD,
  },
  {
    id: "walk-ins",
    title: "Bring friends",
    body: "Once you're checked in, add anyone nearby who hasn't checked in yet.",
    target: WALKTHROUGH_TARGETS.WALK_INS,
  },
  {
    id: "chat",
    title: "Rally the group",
    body: "Use chat to nudge people to sign up or just hang out.",
    target: WALKTHROUGH_TARGETS.CHAT_BAR,
    spotlightPad: 4,
  },
  {
    id: "game-status",
    title: "Watch the go/no-go",
    body:
      "The badge tracks headcount — NOT YET, ALMOST, then GAME ON once you hit target. Rally people to flip it.",
    target: WALKTHROUGH_TARGETS.GAME_STATUS,
    spotlightPad: 4,
  },
];

/** First carousel slide always hosts card/action tour anchors (not game phase). */
export const WALKTHROUGH_GAME_SLIDE_INDEX = 0;
