import { useEffect, useRef, useState } from "react";
import {
  ensureNotificationPermission,
  notifyTimerComplete,
  prepareTimerNotification,
  startBackgroundRestTimer,
  stopBackgroundRestTimer,
  subscribeToRestTimerComplete,
  updateRestTimerNotification,
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
    if (playFeedback) {
      notifyTimerComplete();
    }
    onSkipRef.current();
  }

  useEffect(() => {
    completedEndAtRef.current = null;
    prepareTimerNotification();

    void ensureNotificationPermission().then((granted) => {
      if (!granted) return;
      void startBackgroundRestTimer(endAt, exerciseName);
    });

    return () => {
      stopBackgroundRestTimer();
    };
  }, [endAt, exerciseName]);

  useEffect(() => {
    return subscribeToRestTimerComplete(() => {
      finishTimer(document.visibilityState === "visible");
    });
  }, [endAt]);

  useEffect(() => {
    const syncSecondsLeft = () => {
      setSecondsLeft(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
    };

    syncSecondsLeft();
    const timer = window.setInterval(syncSecondsLeft, 250);

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      syncSecondsLeft();
      if (Date.now() >= endAt) {
        finishTimer(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [endAt]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    void updateRestTimerNotification(secondsLeft, exerciseName);
  }, [secondsLeft, exerciseName]);

  useEffect(() => {
    if (secondsLeft > 0) return;
    if (Date.now() < endAt) return;
    finishTimer(true);
  }, [endAt, secondsLeft]);

  function handleSkip() {
    stopBackgroundRestTimer();
    onSkip();
  }

  return (
    <div className="rest-timer card">
      <div>
        <span>Rest timer</span>
        <strong>
          {Math.floor(secondsLeft / 60)}:
          {String(secondsLeft % 60).padStart(2, "0")}
        </strong>
      </div>
      <div className="rest-timer-actions">
        <button
          type="button"
          className="rest-timer-adjust"
          onClick={() => onAdjust(-30)}
        >
          −30 sec
        </button>
        <button
          type="button"
          className="rest-timer-adjust"
          onClick={() => onAdjust(30)}
        >
          +30 sec
        </button>
        <button className="text-button" type="button" onClick={handleSkip}>
          Skip
        </button>
      </div>
    </div>
  );
}
