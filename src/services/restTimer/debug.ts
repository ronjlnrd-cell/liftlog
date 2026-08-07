export type TimerDebugEvent =
  | "START"
  | "SYNC"
  | "NOTIFICATION_UPDATE"
  | "SW_ACTIVATE"
  | "SW_COMPLETE"
  | "STOP"
  | "RESTORE"
  | "UI_RENDER"
  | "COMPLETE";

export function isTimerDebugEnabled(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("liftlog-rest-timer-debug") === "1";
  } catch {
    return false;
  }
}

export function logTimerDebug(
  event: TimerDebugEvent,
  detail?: Record<string, unknown>,
) {
  if (!isTimerDebugEnabled()) return;
  console.info(`[rest-timer:${event}]`, detail ?? {});
}
