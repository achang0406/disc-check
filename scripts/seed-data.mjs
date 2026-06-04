export const SEED_GROUPS = [
  {
    id: "default",
    name: "Kirkland Disc",
    description: "Weekly pickup games in Kirkland.",
    adminPasscode: "0000",
  },
];

export const SEED_GAMES = [
  {
    id: "g1",
    groupId: "default",
    name: "Wednesday Night Disc",
    location: "Heritage Park",
    address: "11100 NE 68th St, Kirkland, WA 98033",
    weekday: 3,
    startTime: "18:00:00",
    timezone: "America/Los_Angeles",
    type: "goaltimate",
    target: 8,
    status: "open",
  },
];
