export const PLANNED_REST_MIN_SECONDS = 30;
export const PLANNED_REST_MAX_SECONDS = 420;
export const PLANNED_REST_STEP_SECONDS = 30;

export function formatPlannedRestLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function getPlannedRestOptions(currentSeconds?: number): number[] {
  const options: number[] = [];
  for (
    let seconds = PLANNED_REST_MIN_SECONDS;
    seconds <= PLANNED_REST_MAX_SECONDS;
    seconds += PLANNED_REST_STEP_SECONDS
  ) {
    options.push(seconds);
  }

  if (currentSeconds != null && !options.includes(currentSeconds)) {
    options.push(currentSeconds);
    options.sort((a, b) => a - b);
  }

  return options;
}
