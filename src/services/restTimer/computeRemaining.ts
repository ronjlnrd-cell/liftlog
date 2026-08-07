export function getRemainingMs(endAt: number, now = Date.now()): number {
  return Math.max(0, endAt - now);
}

export function getRemainingSeconds(endAt: number, now = Date.now()): number {
  return Math.ceil(getRemainingMs(endAt, now) / 1000);
}

export function hasTimerExpired(endAt: number, now = Date.now()): boolean {
  return now >= endAt;
}

export function msUntilNextSecondBoundary(endAt: number, now = Date.now()): number {
  const secondsLeft = getRemainingSeconds(endAt, now);
  if (secondsLeft <= 0) return 0;

  const nextBoundary = endAt - (secondsLeft - 1) * 1000;
  return Math.max(0, nextBoundary - now);
}

export function formatRestTime(secondsLeft: number): string {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
