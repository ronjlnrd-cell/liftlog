import type { RestTimerState } from "./types";

const STORAGE_KEY = "liftlog-rest-timer-state";

export function loadRestTimerState(): RestTimerState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as RestTimerState;
    if (
      typeof parsed.timerId !== "string" ||
      typeof parsed.endAt !== "number" ||
      !Number.isFinite(parsed.endAt)
    ) {
      return null;
    }

    return {
      timerId: parsed.timerId,
      endAt: parsed.endAt,
      exerciseName:
        typeof parsed.exerciseName === "string"
          ? parsed.exerciseName
          : undefined,
    };
  } catch {
    return null;
  }
}

export function saveRestTimerState(state: RestTimerState | null) {
  if (typeof window === "undefined") return;

  if (!state) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
