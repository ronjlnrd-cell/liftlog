import type { CompletedSet, Workout } from "../entities/workout";

export type PRType = "weight" | "estimated1RM";

export type ExercisePRBaseline = {
  maxWeight: number;
  maxEstimated1RM: number;
};

export type SetPR = {
  workoutId: string;
  workoutExerciseId: string;
  setOrder: number;
  exerciseId: string;
  types: PRType[];
};

export function estimated1RM(set: Pick<CompletedSet, "weight" | "reps">): number {
  if (set.weight <= 0 || set.reps < 1) return 0;
  return set.weight * (1 + set.reps / 30);
}

export function getExerciseBaseline(
  workouts: Workout[],
  exerciseId: string,
): ExercisePRBaseline {
  let maxWeight = 0;
  let maxEstimated1RM = 0;

  for (const workout of workouts) {
    for (const item of workout.exercises) {
      if (item.exerciseId !== exerciseId) continue;
      for (const set of item.completedSets) {
        maxWeight = Math.max(maxWeight, set.weight);
        maxEstimated1RM = Math.max(maxEstimated1RM, estimated1RM(set));
      }
    }
  }

  return { maxWeight, maxEstimated1RM };
}

export function getWorkoutPRs(workouts: Workout[]): Map<string, SetPR> {
  const records = new Map<string, ExercisePRBaseline>();
  const result = new Map<string, SetPR>();
  const chronological = [...workouts].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );

  for (const workout of chronological) {
    const items = [...workout.exercises].sort((a, b) => a.order - b.order);

    for (const item of items) {
      const baseline = records.get(item.exerciseId) ?? {
        maxWeight: 0,
        maxEstimated1RM: 0,
      };

      for (const set of [...item.completedSets].sort((a, b) => a.order - b.order)) {
        const types: PRType[] = [];
        const e1rm = estimated1RM(set);

        if (set.weight > baseline.maxWeight) types.push("weight");
        if (e1rm > baseline.maxEstimated1RM) types.push("estimated1RM");

        if (types.length > 0) {
          result.set(setKey(workout.id, item.id, set.order), {
            workoutId: workout.id,
            workoutExerciseId: item.id,
            setOrder: set.order,
            exerciseId: item.exerciseId,
            types,
          });
        }

        baseline.maxWeight = Math.max(baseline.maxWeight, set.weight);
        baseline.maxEstimated1RM = Math.max(baseline.maxEstimated1RM, e1rm);
      }

      records.set(item.exerciseId, baseline);
    }
  }

  return result;
}

export function getActiveWorkoutPRs(
  history: Workout[],
  activeWorkout: Workout,
): Map<string, PRType[]> {
  const baselines = new Map<string, ExercisePRBaseline>();
  const result = new Map<string, PRType[]>();

  for (const item of activeWorkout.exercises) {
    if (!baselines.has(item.exerciseId)) {
      baselines.set(item.exerciseId, getExerciseBaseline(history, item.exerciseId));
    }

    const baseline = baselines.get(item.exerciseId)!;
    for (const set of [...item.completedSets].sort((a, b) => a.order - b.order)) {
      const types: PRType[] = [];
      const e1rm = estimated1RM(set);

      if (set.weight > baseline.maxWeight) types.push("weight");
      if (e1rm > baseline.maxEstimated1RM) types.push("estimated1RM");

      if (types.length > 0) {
        result.set(activeSetKey(item.id, set.order), types);
      }

      baseline.maxWeight = Math.max(baseline.maxWeight, set.weight);
      baseline.maxEstimated1RM = Math.max(baseline.maxEstimated1RM, e1rm);
    }
  }

  return result;
}

export function setKey(
  workoutId: string,
  workoutExerciseId: string,
  setOrder: number,
): string {
  return `${workoutId}:${workoutExerciseId}:${setOrder}`;
}

export function activeSetKey(workoutExerciseId: string, setOrder: number): string {
  return `${workoutExerciseId}:${setOrder}`;
}

export function prLabel(types: PRType[]): string {
  if (types.includes("weight") && types.includes("estimated1RM")) {
    return "1RM + Weight PR";
  }
  if (types.includes("weight")) return "Weight PR";
  return "1RM PR";
}
