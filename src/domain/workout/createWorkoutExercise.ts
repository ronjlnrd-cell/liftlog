import type { WorkoutExercise } from "../entities/workout";
import type { ExerciseProgressionPreset } from "./exerciseProgressionPresets";
import { createWorkoutExerciseFromPreset } from "./exerciseProgressionPresets";

const DEFAULT_REST_SECONDS = 120;
const DEFAULT_WEIGHT = 0;
const DEFAULT_REPS = 5;

export function createWorkoutExercise(
  exerciseId: string,
  order: number,
  previous: WorkoutExercise | null,
  progression?: ExerciseProgressionPreset | null,
): WorkoutExercise {
  if (progression) {
    return createWorkoutExerciseFromPreset(exerciseId, order, progression);
  }

  if (previous) {
    if (previous.completedSets.length > 0) {
      const sorted = [...previous.completedSets].sort((a, b) => a.order - b.order);
      return {
        id: crypto.randomUUID(),
        exerciseId,
        order,
        plannedRestSeconds: previous.plannedRestSeconds ?? DEFAULT_REST_SECONDS,
        plannedSets: sorted.map((set, index) => ({
          order: index,
          weight: set.weight,
          reps: set.reps,
        })),
        completedSets: [],
      };
    }

    if (previous.plannedSets.length > 0) {
      return {
        id: crypto.randomUUID(),
        exerciseId,
        order,
        plannedRestSeconds: previous.plannedRestSeconds ?? DEFAULT_REST_SECONDS,
        plannedSets: [...previous.plannedSets]
          .sort((a, b) => a.order - b.order)
          .map((set, index) => ({
            order: index,
            weight: set.weight ?? DEFAULT_WEIGHT,
            reps: set.reps,
          })),
        completedSets: [],
      };
    }
  }

  return {
    id: crypto.randomUUID(),
    exerciseId,
    order,
    plannedRestSeconds: DEFAULT_REST_SECONDS,
    plannedSets: [
      {
        order: 0,
        weight: DEFAULT_WEIGHT,
        reps: DEFAULT_REPS,
      },
    ],
    completedSets: [],
  };
}
