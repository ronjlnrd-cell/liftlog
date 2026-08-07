import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  formatRestTime,
  getRemainingSeconds,
} from "../../services/restTimer/computeRemaining";
import { restTimerService } from "../../services/restTimer/RestTimerService";

type RestTimerProps = {
  onSkip: () => void;
  onAdjust: (deltaSeconds: number) => void;
};

export function RestTimer({ onSkip, onAdjust }: RestTimerProps) {
  const snapshot = useSyncExternalStore(
    restTimerService.subscribe,
    restTimerService.getSnapshot,
    restTimerService.getSnapshot,
  );

  if (!snapshot) return null;

  const secondsLeft = getRemainingSeconds(snapshot.endAt);
  const timeLabel = formatRestTime(secondsLeft);

  return createPortal(
    <div
      className="rest-timer-bubble"
      role="timer"
      aria-live="polite"
      aria-label={
        snapshot.exerciseName
          ? `Rest timer for ${snapshot.exerciseName}: ${timeLabel} remaining`
          : `Rest timer: ${timeLabel} remaining`
      }
    >
      <button
        type="button"
        className="rest-timer-bubble-btn"
        aria-label="Subtract 30 seconds"
        onClick={() => onAdjust(-30)}
      >
        −
      </button>
      <div className="rest-timer-bubble-display">
        <strong>{timeLabel}</strong>
        {snapshot.exerciseName && (
          <span className="rest-timer-bubble-label">{snapshot.exerciseName}</span>
        )}
      </div>
      <button
        type="button"
        className="rest-timer-bubble-btn"
        aria-label="Add 30 seconds"
        onClick={() => onAdjust(30)}
      >
        +
      </button>
      <button
        type="button"
        className="rest-timer-bubble-skip"
        aria-label="Skip rest timer"
        onClick={onSkip}
      >
        ×
      </button>
    </div>,
    document.body,
  );
}
