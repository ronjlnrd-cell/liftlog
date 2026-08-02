import type { CompletedSet, Workout } from "../entities/workout";

export type PRType = "estimated1RM" | "repPR" | "weight";

export type ExercisePRBaseline = {
  maxWeight: number;
  maxEstimated1RM: number;
  maxWeightByReps: Map<number, number>;
};

export type SetPR = {
  workoutId: string;
  workoutExerciseId: string;
  setOrder: number;
  exerciseId: string;
  types: PRType[];
};

const PR_PRIORITY: PRType[] = ["estimated1RM", "repPR", "weight"];

export function estimated1RM(set: Pick<CompletedSet, "weight" | "reps">): number {
  if (set.weight <= 0 || set.reps < 1) return 0;
  return set.weight * (1 + set.reps / 30);
}

function emptyBaseline(): ExercisePRBaseline {
  return {
    maxWeight: 0,
    maxEstimated1RM: 0,
    maxWeightByReps: new Map(),
  };
}

function detectPRTypes(
  set: Pick<CompletedSet, "weight" | "reps">,
  baseline: ExercisePRBaseline,
): PRType[] {
  const types: PRType[] = [];
  const e1rm = estimated1RM(set);

  if (e1rm > baseline.maxEstimated1RM) types.push("estimated1RM");

  const priorAtReps = baseline.maxWeightByReps.get(set.reps) ?? 0;
  if (priorAtReps > 0 && set.weight > priorAtReps) types.push("repPR");

  if (set.weight > baseline.maxWeight) types.push("weight");

  return types;
}

function updateBaseline(
  baseline: ExercisePRBaseline,
  set: Pick<CompletedSet, "weight" | "reps">,
): void {
  baseline.maxWeight = Math.max(baseline.maxWeight, set.weight);
  baseline.maxEstimated1RM = Math.max(
    baseline.maxEstimated1RM,
    estimated1RM(set),
  );

  const priorAtReps = baseline.maxWeightByReps.get(set.reps) ?? 0;
  baseline.maxWeightByReps.set(
    set.reps,
    Math.max(priorAtReps, set.weight),
  );
}

export function getHighestPriorityPRType(types: PRType[]): PRType | null {
  for (const type of PR_PRIORITY) {
    if (types.includes(type)) return type;
  }
  return null;
}

export function getExerciseBaseline(
  workouts: Workout[],
  exerciseId: string,
): ExercisePRBaseline {
  const baseline = emptyBaseline();

  for (const workout of workouts) {
    for (const item of workout.exercises) {
      if (item.exerciseId !== exerciseId) continue;
      for (const set of item.completedSets) {
        updateBaseline(baseline, set);
      }
    }
  }

  return baseline;
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
      const baseline = records.get(item.exerciseId) ?? emptyBaseline();

      for (const set of [...item.completedSets].sort((a, b) => a.order - b.order)) {
        const types = detectPRTypes(set, baseline);

        if (types.length > 0) {
          result.set(setKey(workout.id, item.id, set.order), {
            workoutId: workout.id,
            workoutExerciseId: item.id,
            setOrder: set.order,
            exerciseId: item.exerciseId,
            types,
          });
        }

        updateBaseline(baseline, set);
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
      baselines.set(
        item.exerciseId,
        getExerciseBaseline(history, item.exerciseId),
      );
    }

    const baseline = baselines.get(item.exerciseId)!;
    for (const set of [...item.completedSets].sort((a, b) => a.order - b.order)) {
      const types = detectPRTypes(set, baseline);

      if (types.length > 0) {
        result.set(activeSetKey(item.id, set.order), types);
      }

      updateBaseline(baseline, set);
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
  const top = getHighestPriorityPRType(types);
  if (!top) return "";

  switch (top) {
    case "estimated1RM":
      return "1RM PR";
    case "repPR":
      return "Rep PR";
    case "weight":
      return "Weight PR";
  }
}
