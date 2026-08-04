import { useEffect, useRef, useState } from "react";
import {
  clearRestTimerNotification,
  ensureNotificationPermission,
  notifyTimerComplete,
  prepareTimerNotification,
  updateRestTimerNotification,
} from "../../shared/timerNotification";

type RestTimerProps = {
  endAt: number;
  exerciseName?: string;
  onSkip: () => void;
};

export function RestTimer({ endAt, exerciseName, onSkip }: RestTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const completedEndAtRef = useRef<number | null>(null);

  useEffect(() => {
    completedEndAtRef.current = null;
    prepareTimerNotification();

    void ensureNotificationPermission().then((granted) => {
      if (!granted) return;
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      updateRestTimerNotification(remaining, exerciseName);
    });

    return () => {
      clearRestTimerNotification();
    };
  }, [endAt, exerciseName]);

  useEffect(() => {
    const update = () => {
      setSecondsLeft(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
    };

    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [endAt]);

  useEffect(() => {
    if (secondsLeft > 0) {
      updateRestTimerNotification(secondsLeft, exerciseName);
      return;
    }

    if (Date.now() < endAt) return;
    if (completedEndAtRef.current === endAt) return;

    completedEndAtRef.current = endAt;
    notifyTimerComplete();
    onSkip();
  }, [endAt, exerciseName, onSkip, secondsLeft]);

  function handleSkip() {
    clearRestTimerNotification();
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
      <button className="text-button" type="button" onClick={handleSkip}>
        Skip
      </button>
    </div>
  );
}
