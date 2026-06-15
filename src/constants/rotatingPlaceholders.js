const MS_PER_DAY = 86_400_000;

export const CHAT_PLACEHOLDERS = [
  "Rally the squad…",
  "Who's bringing snacks?",
  "Call subs from the sideline…",
  "Trash talk, politely.",
  "Where's the field again?",
  "Five more minutes??",
  "Who forgot their disc?",
  "Claim your MVP take…",
  "Weather check?",
  "Game on or game off?",
  "Car pool pitch…",
  "Post-game plans?",
  "Need one more for numbers…",
  "Anyone else running late?",
  "Who's always late?",
];

export const CHAT_POSTGAME_PLACEHOLDERS = [
  "MVP vote — go.",
  "Who had the best huck?",
  "Rematch when?",
  "Where are we eating?",
  "Rate tonight's calls…",
  "That layout tho…",
  "Highlight reel nominations?",
  "Who owes beers?",
  "Already sore tomorrow?",
  "Next week same time?",
  "Clip or it didn't happen.",
  "Hot take from the game?",
  "Car ride debrief?",
  "Injury report?",
  "What was the score?",
];

export const WALK_IN_COMING_PLACEHOLDERS = [
  "Who else is coming?",
  "Plus one? Drop a name…",
  "Drag a friend along…",
  "Room for one more?",
  "Nominate your buddy…",
  "Who's riding with you?",
  "Tag a disc fiend…",
  "Convince a coworker…",
  "Who needs a nudge?",
  "Bring your roommate.",
  "Know someone free tonight?",
  "Plus a guest or two…",
  "Who's on the fence?",
];

export const WALK_IN_HERE_PLACEHOLDERS = [
  "Who else is here?",
  "Just rolled up? Name them…",
  "Spot someone on the sideline?",
  "Late arrival? Add 'em.",
  "Who showed up with you?",
  "Friend wandered over?",
  "Add the walk-on.",
  "Someone join mid-game?",
  "Who's warming up nearby?",
  "Tag the straggler…",
  "Plus one on the field?",
  "Who'd you bring?",
  "Name that mystery player.",
  "Who just parked?",
];

function dayIndex(date = new Date()) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(local.getTime() / MS_PER_DAY);
}

export function pickDailyItem(items, date = new Date()) {
  if (!items?.length) return "";
  return items[dayIndex(date) % items.length];
}

export function getDailyChatPlaceholder(isEnded = false, date = new Date()) {
  return pickDailyItem(isEnded ? CHAT_POSTGAME_PLACEHOLDERS : CHAT_PLACEHOLDERS, date);
}

export function getDailyWalkInPlaceholder(isLive, date = new Date()) {
  return pickDailyItem(isLive ? WALK_IN_HERE_PLACEHOLDERS : WALK_IN_COMING_PLACEHOLDERS, date);
}
