import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  clearRestTimerNotification,
  ensureNotificationPermission,
  notifyTimerComplete,
  prepareTimerNotification,
  shouldPlayCompletionFeedback,
  startBackgroundRestTimer,
  stopBackgroundRestTimer,
  subscribeToRestTimerComplete,
  syncBackgroundRestTimer,
} from "../../shared/timerNotification";

type RestTimerProps = {
  endAt: number;
  exerciseName?: string;
  onSkip: () => void;
  onAdjust: (deltaSeconds: number) => void;
};

export function RestTimer({ endAt, exerciseName, onSkip, onAdjust }: RestTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const completedEndAtRef = useRef<number | null>(null);
  const onSkipRef = useRef(onSkip);
  onSkipRef.current = onSkip;

  function finishTimer(playFeedback: boolean) {
    if (completedEndAtRef.current === endAt) return;
    completedEndAtRef.current = endAt;
    void clearRestTimerNotification();
    if (playFeedback) {
      notifyTimerComplete();
    }
    onSkipRef.current();
  }

  useEffect(() => {
    completedEndAtRef.current = null;
    prepareTimerNotification();
    void ensureNotificationPermission();
    void startBackgroundRestTimer(endAt, exerciseName);

    return () => {
      stopBackgroundRestTimer();
    };
  }, [endAt, exerciseName]);

  useEffect(() => {
    return subscribeToRestTimerComplete((completedAt) => {
      finishTimer(
        document.visibilityState === "visible" &&
          shouldPlayCompletionFeedback(endAt, completedAt),
      );
    });
  }, [endAt]);

  useEffect(() => {
    const syncSecondsLeft = () => {
      setSecondsLeft(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
    };

    syncSecondsLeft();
    const timer = window.setInterval(syncSecondsLeft, 250);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        syncBackgroundRestTimer(endAt, exerciseName);
        return;
      }

      void clearRestTimerNotification();
      syncSecondsLeft();

      if (Date.now() >= endAt) {
        finishTimer(shouldPlayCompletionFeedback(endAt));
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [endAt, exerciseName]);

  useEffect(() => {
    if (secondsLeft > 0) return;
    if (Date.now() < endAt) return;
    if (document.visibilityState !== "visible") return;
    finishTimer(shouldPlayCompletionFeedback(endAt));
  }, [endAt, secondsLeft]);

  function handleSkip() {
    stopBackgroundRestTimer();
    onSkip();
  }

  const timeLabel = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return createPortal(
    <div
      className="rest-timer-bubble"
      role="timer"
      aria-live="polite"
      aria-label={
        exerciseName
          ? `Rest timer for ${exerciseName}: ${timeLabel} remaining`
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
        {exerciseName && (
          <span className="rest-timer-bubble-label">{exerciseName}</span>
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
        onClick={handleSkip}
      >
        ×
      </button>
    </div>,
    document.body,
  );
}
