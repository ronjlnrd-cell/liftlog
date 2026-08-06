import type { Exercise } from "../entities/Exercise";
import { ExerciseSource } from "../types/exercise-source";

export function isCustomExercise(exercise: Exercise): boolean {
  return exercise.source !== ExerciseSource.BUILT_IN;
}

export function splitBuiltInAndCustom(exercises: Exercise[]): {
  builtIns: Exercise[];
  customs: Exercise[];
} {
  const builtIns: Exercise[] = [];
  const customs: Exercise[] = [];
  for (const exercise of exercises) {
    if (isCustomExercise(exercise)) {
      customs.push(exercise);
    } else {
      builtIns.push(exercise);
    }
  }
  return { builtIns, customs };
}

/**
 * Merge cloud custom exercises with local Dexie customs.
 * Local entries always win on id conflicts so unsynced customs survive cloud reload.
 */
export function mergeCustomExercises(
  localCustom: Exercise[],
  cloudCustom: Exercise[],
): Exercise[] {
  const merged = new Map<string, Exercise>();

  for (const exercise of cloudCustom) {
    merged.set(exercise.id, exercise);
  }

  for (const exercise of localCustom) {
    merged.set(exercise.id, exercise);
  }

  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function mergeExerciseCatalog(
  localExercises: Exercise[],
  cloudCustom: Exercise[],
): Exercise[] {
  const { builtIns, customs } = splitBuiltInAndCustom(localExercises);
  const mergedCustom = mergeCustomExercises(customs, cloudCustom);
  return [...builtIns, ...mergedCustom].sort((a, b) => a.name.localeCompare(b.name));
}
