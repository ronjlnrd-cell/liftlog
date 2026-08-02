import type { Workout, WorkoutExercise } from "../entities/workout";

function compareWorkoutsNewestFirst(a: Workout, b: Workout): number {
  return (
    new Date(b.completedAt ?? b.startedAt).getTime() -
    new Date(a.completedAt ?? a.startedAt).getTime()
  );
}

/** One pass over completed workouts; stops once every requested exercise is found. */
export function getPreviousPerformanceByExerciseId(
  workouts: Workout[],
  exerciseIds: string[],
): Map<string, WorkoutExercise> {
  const result = new Map<string, WorkoutExercise>();
  if (exerciseIds.length === 0) return result;

  const needed = new Set(exerciseIds);
  const completed = workouts
    .filter((workout) => workout.completedAt)
    .sort(compareWorkoutsNewestFirst);

  for (const workout of completed) {
    if (result.size === needed.size) break;

    for (const item of workout.exercises) {
      if (
        needed.has(item.exerciseId) &&
        !result.has(item.exerciseId) &&
        item.completedSets.length > 0
      ) {
        result.set(item.exerciseId, item);
      }
    }
  }

  return result;
}
