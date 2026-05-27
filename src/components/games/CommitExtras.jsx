import PlusOnesInput from "./PlusOnesInput.jsx";
import BringingKitToggle from "./BringingKitToggle.jsx";

export default function CommitExtras({
  plusOnes,
  onPlusOnesChange,
  bringingKit,
  onBringingKitChange,
  guestsLabel = "Guests",
  kitLabel = "Bringing kit",
  disabled = false,
}) {
  return (
    <div className="commit-extras">
      <PlusOnesInput
        value={plusOnes}
        onChange={onPlusOnesChange}
        label={guestsLabel}
        disabled={disabled}
      />
      <BringingKitToggle
        value={bringingKit}
        onChange={onBringingKitChange}
        label={kitLabel}
        disabled={disabled}
      />
    </div>
  );
}
