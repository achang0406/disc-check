import { useEffect, useRef, useState } from "react";
import EditIcon from "../ui/EditIcon.jsx";
import Button from "../ui/Button.jsx";
import GameCommitStrip from "./GameCommitStrip.jsx";
import { useGameClock } from "../../hooks/useGameClock.js";
import { isGameEnded, isGameLive } from "../../utils/gameSchedule.js";
import { countHeadcount, countPlayers } from "../../utils/format.js";

export default function GameCommitCard({
  profile,
  game,
  rsvps,
  checkIns,
  guests,
  myRsvps,
  myCheckIns,
  savingGameId,
  isRsvpd,
  isCheckedIn,
  onRequestRsvp,
  onCancel,
  onRequestCheckIn,
  onCheckOut,
  onAddWalkIn,
  onRemoveWalkIn,
  showToast,
  isAdmin,
  onEditGame,
}) {
  const now = useGameClock();
  const [plusOnes, setPlusOnes] = useState(0);
  const [bringingKit, setBringingKit] = useState(false);
  const [herePlusOnes, setHerePlusOnes] = useState(0);
  const [hereBringingKit, setHereBringingKit] = useState(false);
  const prevRsvpIdsRef = useRef(null);

  const live = isGameLive(game, now);
  const ended = isGameEnded(game, now);
  const rsvpCount = countPlayers(rsvps, game.id);
  const checkInCount = countHeadcount(checkIns, guests, game.id);
  const rsvpEntries = rsvps[game.id] || [];
  const checkInEntries = checkIns[game.id] || [];
  const walkInEntries = guests[game.id] || [];
  const rsvpd = isRsvpd(game.id);
  const checkedIn = isCheckedIn(game.id);
  const saving = savingGameId === game.id;
  const activeCount = live || ended ? checkInCount : rsvpCount;

  useEffect(() => {
    if (!live) {
      setPlusOnes(myRsvps[game.id]?.plusOnes ?? 0);
      setBringingKit(myRsvps[game.id]?.bringingKit ?? false);
    }
  }, [game.id, live, myRsvps]);

  useEffect(() => {
    if (!live) return;
    setHerePlusOnes(myCheckIns[game.id]?.plusOnes ?? 0);
    setHereBringingKit(myCheckIns[game.id]?.bringingKit ?? false);
  }, [game.id, live, myCheckIns]);

  useEffect(() => {
    if (live || !showToast) return;

    const currentIds = new Set(rsvpEntries.map((entry) => entry.userId));

    if (prevRsvpIdsRef.current === null) {
      prevRsvpIdsRef.current = currentIds;
      return;
    }

    const newSignups = rsvpEntries.filter(
      (entry) =>
        !prevRsvpIdsRef.current.has(entry.userId) && entry.userId !== profile?.id,
    );

    for (const entry of newSignups) {
      const plusText = entry.plusOnes > 0 ? ` (+${entry.plusOnes})` : "";
      showToast(`${entry.name}${plusText} signed up for ${game.name}`, "success");
    }

    prevRsvpIdsRef.current = currentIds;
  }, [game.name, live, profile?.id, rsvpEntries, showToast]);

  const cancelled = game.status === "cancelled";
  const panelClass = [
    "game-detail-panel",
    "surface",
    "game-commit-card",
    live ? "game-detail-panel--live" : "",
    ended ? "game-detail-panel--ended" : "",
    !live && rsvpd && !cancelled ? "game-detail-panel--rsvpd" : "",
    live && checkedIn && !cancelled ? "game-detail-panel--here" : "",
    cancelled ? "game-detail-panel--cancelled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const actionProps =
    !ended && !cancelled
      ? {
          game,
          isLive: live,
          rsvpd,
          checkedIn,
          saving,
          plusOnes,
          onPlusOnesChange: setPlusOnes,
          bringingKit,
          onBringingKitChange: setBringingKit,
          herePlusOnes,
          onHerePlusOnesChange: setHerePlusOnes,
          hereBringingKit,
          onHereBringingKitChange: setHereBringingKit,
          onRequestRsvp,
          onCancel,
          onRequestCheckIn,
          onCheckOut,
          isEnded: ended,
        }
      : null;

  const adminAction =
    isAdmin && onEditGame ? (
      <Button
        variant="icon"
        className="game-card__edit-btn"
        onClick={() => onEditGame(game)}
        aria-label={`Edit ${game.name}`}
      >
        <EditIcon />
      </Button>
    ) : null;

  return (
    <div className={panelClass}>
      <GameCommitStrip
        profile={profile}
        game={game}
        isLive={live}
        isEnded={ended}
        rsvpd={rsvpd}
        checkedIn={checkedIn}
        count={activeCount}
        rsvpEntries={rsvpEntries}
        checkInEntries={checkInEntries}
        walkInEntries={walkInEntries}
        onAddressCopy={() => showToast?.("Address copied")}
        adminAction={adminAction}
        onAddWalkIn={onAddWalkIn}
        onRemoveWalkIn={onRemoveWalkIn}
        saving={saving}
        actionProps={actionProps}
      />
    </div>
  );
}
