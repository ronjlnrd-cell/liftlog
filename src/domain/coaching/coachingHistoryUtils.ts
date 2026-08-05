import type { Workout } from "../entities/workout";

export function resolveCoachingEntryDate(
  workoutId: string,
  createdAt: string,
  workoutById: Map<string, Workout>,
): Date {
  const workout = workoutById.get(workoutId);
  const raw =
    workout?.completedAt ?? workout?.startedAt ?? createdAt;
  return new Date(raw);
}
