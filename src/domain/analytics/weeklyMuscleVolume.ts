import type { Exercise } from "../entities/Exercise";
import type { Workout } from "../entities/workout";
import { MuscleGroup } from "../types/MuscleGroup";

export const TRACKED_MUSCLE_GROUPS = Object.values(MuscleGroup).filter(
  (muscle) => muscle !== MuscleGroup.UNKNOWN && muscle !== MuscleGroup.QUADS,
);

export function resolveTrackedMuscleGroup(muscle: string): string | null {
  if (muscle === MuscleGroup.UNKNOWN) return null;
  if (muscle === MuscleGroup.QUADS) return MuscleGroup.QUADRICEPS;
  return TRACKED_MUSCLE_GROUPS.includes(muscle as (typeof TRACKED_MUSCLE_GROUPS)[number])
    ? muscle
    : null;
}

export function getWeeklyMuscleSetCounts(
  exercises: Exercise[],
  workouts: Workout[],
  options?: { activeWorkout?: Workout | null; sinceMs?: number },
): Map<string, number> {
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const sinceMs = options?.sinceMs ?? Date.now() - 7 * 86_400_000;
  const counts = new Map<string, number>(
    TRACKED_MUSCLE_GROUPS.map((muscle) => [muscle, 0]),
  );

  const workoutsToCount = workouts.filter((workout) => {
    if (!workout.completedAt) return false;
    return new Date(workout.completedAt).getTime() >= sinceMs;
  });

  if (options?.activeWorkout && !options.activeWorkout.completedAt) {
    workoutsToCount.push(options.activeWorkout);
  }

  for (const workout of workoutsToCount) {
    for (const item of workout.exercises) {
      const exercise = exerciseById.get(item.exerciseId);
      if (!exercise) continue;

      const muscle = resolveTrackedMuscleGroup(exercise.primaryMuscle);
      if (!muscle) continue;

      counts.set(muscle, (counts.get(muscle) ?? 0) + item.completedSets.length);
    }
  }

  return counts;
}
