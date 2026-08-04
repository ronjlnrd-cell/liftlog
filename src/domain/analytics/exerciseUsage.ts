import type { Workout } from "../entities/workout";

export function getExerciseUsageCounts(
  workouts: Workout[],
  options?: { extraWorkouts?: Workout[] },
): Map<string, number> {
  const counts = new Map<string, number>();
  const sources = options?.extraWorkouts?.length
    ? [...workouts, ...options.extraWorkouts]
    : workouts;

  for (const workout of sources) {
    const performedInWorkout = new Set<string>();
    for (const item of workout.exercises) {
      if (item.completedSets.length > 0) {
        performedInWorkout.add(item.exerciseId);
      }
    }
    for (const exerciseId of performedInWorkout) {
      counts.set(exerciseId, (counts.get(exerciseId) ?? 0) + 1);
    }
  }

  return counts;
}

export function compareExercisesByUsage(
  a: { id: string; name: string },
  b: { id: string; name: string },
  usageCounts: Map<string, number>,
  mode: "frequency" | "az",
): number {
  if (mode === "az") return a.name.localeCompare(b.name);
  const difference = (usageCounts.get(b.id) ?? 0) - (usageCounts.get(a.id) ?? 0);
  return difference || a.name.localeCompare(b.name);
}
