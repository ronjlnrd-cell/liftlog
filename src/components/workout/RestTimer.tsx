import { useEffect, useState } from "react";

type RestTimerProps = {
  endAt: number;
  onSkip: () => void;
};

export function RestTimer({ endAt, onSkip }: RestTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const update = () => {
      setSecondsLeft(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
    };

    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [endAt]);

  useEffect(() => {
    if (secondsLeft === 0 && Date.now() >= endAt) {
      onSkip();
    }
  }, [endAt, onSkip, secondsLeft]);

  return (
    <div className="rest-timer card">
      <div>
        <span>Rest timer</span>
        <strong>
          {Math.floor(secondsLeft / 60)}:
          {String(secondsLeft % 60).padStart(2, "0")}
        </strong>
      </div>
      <button className="text-button" onClick={onSkip}>
        Skip
      </button>
    </div>
  );
}
