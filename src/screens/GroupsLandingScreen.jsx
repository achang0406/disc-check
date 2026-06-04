import { useMemo } from "react";
import AppHeader from "../components/layout/AppHeader.jsx";
import GroupListItem from "../components/groups/GroupListItem.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { gamesForGroup } from "../lib/data.js";
import { useGameClock } from "../hooks/useGameClock.js";
import { sortGamesForLanding, sortGroupsForLanding } from "../utils/gameSchedule.js";
import { formatSchedulePreview } from "../utils/time.js";

function buildGroupSummary(group, games, now) {
  const childGames = sortGamesForLanding(games, now);
  if (childGames.length === 0) return "No games yet";

  const countLabel = `${childGames.length} game${childGames.length === 1 ? "" : "s"}`;
  const next = childGames[0];
  const schedule = formatSchedulePreview(next);
  return schedule ? `${countLabel} · ${schedule}` : countLabel;
}

export default function GroupsLandingScreen({
  profile,
  groups,
  games,
  onProfileClick,
  theme,
  onToggleTheme,
}) {
  const now = useGameClock();
  const sortedGroups = useMemo(
    () => sortGroupsForLanding(groups, games, now),
    [groups, games, now],
  );

  return (
    <div className="games-screen">
      <AppHeader
        profile={profile}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onProfileClick={onProfileClick}
        showInstallLink
      />

      <main className="games-screen__main games-screen__main--landing">
        {sortedGroups.length === 0 ? (
          <EmptyState text="No groups yet" />
        ) : (
          <div className="game-list">
            {sortedGroups.map((group, index) => (
              <div key={group.id} style={{ animation: `fadeUp ${0.2 + index * 0.04}s ease` }}>
                <GroupListItem
                  group={group}
                  summary={buildGroupSummary(group, gamesForGroup(games, group.id), now)}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
