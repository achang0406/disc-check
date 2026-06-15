import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import AppHeader from "../components/layout/AppHeader.jsx";
import GroupListItem from "../components/groups/GroupListItem.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import WelcomeModal from "../components/welcome/WelcomeModal.jsx";
import { gamesForGroup } from "../lib/data.js";
import { useGameClock } from "../hooks/useGameClock.js";
import { useWelcomeModal } from "../hooks/useWelcomeModal.js";
import { sortGamesForLanding, sortGroupsForLanding } from "../utils/gameSchedule.js";
import { formatGameScheduleSlot } from "../utils/time.js";
import { shouldStayOnLanding } from "../utils/landingNavigation.js";

function buildGroupSummary(games) {
  const childGames = sortGamesForLanding(games);
  if (childGames.length === 0) return "No games yet";

  const countLabel = `${childGames.length} game${childGames.length === 1 ? "" : "s"}`;
  const slots = childGames.map(formatGameScheduleSlot).filter(Boolean);
  if (slots.length === 0) return countLabel;

  return `${countLabel} · ${slots.join(" · ")}`;
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
  const welcome = useWelcomeModal({ groupCount: sortedGroups.length });

  if (
    sortedGroups.length === 1
    && !shouldStayOnLanding()
    && welcome.hasSeenWelcomeBefore
  ) {
    return <Navigate to={`/groups/${sortedGroups[0].id}`} replace />;
  }

  return (
    <div className="games-screen games-screen--landing">
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
                  summary={buildGroupSummary(gamesForGroup(games, group.id))}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {welcome.isActive && welcome.currentStep && (
        <WelcomeModal
          step={welcome.currentStep}
          stepIndex={welcome.stepIndex}
          totalSteps={welcome.totalSteps}
          canGoBack={welcome.canGoBack}
          onNext={welcome.next}
          onBack={welcome.back}
          onSkip={welcome.skip}
        />
      )}
    </div>
  );
}
