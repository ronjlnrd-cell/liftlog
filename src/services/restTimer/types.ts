export type RestTimerState = {
  endAt: number;
  exerciseName?: string;
};

export const REST_TIMER_MESSAGE = {
  START: "REST_TIMER_START",
  STOP: "REST_TIMER_STOP",
  SYNC: "REST_TIMER_SYNC",
  COMPLETE: "REST_TIMER_COMPLETE",
} as const;

export const REST_TIMER_STALE_FEEDBACK_MS = 3000;
