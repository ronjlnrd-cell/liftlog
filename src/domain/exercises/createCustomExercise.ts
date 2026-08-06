import { exerciseRepository } from "../../data/repositories/ExerciseRepository";
import type { Exercise } from "../entities/Exercise";
import { ExerciseSource } from "../types/exercise-source";
import { MovementPattern } from "../types/MovementPattern";
import type { MuscleGroup } from "../types/MuscleGroup";
import { DEFAULT_PRIMARY_MUSCLE } from "./primaryMuscleOptions";
import type { LoadType } from "../types/LoadType";
import { DEFAULT_LOAD_TYPE } from "./loadTypeOptions";

export type CreateCustomExerciseInput = {
  name: string;
  primaryMuscle?: MuscleGroup;
  loadType?: LoadType;
};

export type CreateCustomExerciseResult =
  | { ok: true; exercise: Exercise }
  | { ok: false; error: string };

export async function createCustomExercise(
  input: CreateCustomExerciseInput,
  existing: Exercise[],
): Promise<CreateCustomExerciseResult> {
  const trimmed = input.name.trim();
  if (!trimmed) {
    return { ok: false, error: "Exercise name is required." };
  }

  if (
    existing.some(
      (exercise) =>
        exercise.name.toLowerCase() === trimmed.toLowerCase() &&
        !exercise.archivedAt,
    )
  ) {
    return { ok: false, error: "An exercise with this name already exists." };
  }

  const exercise: Exercise = {
    id: crypto.randomUUID(),
    name: trimmed,
    primaryMuscle: input.primaryMuscle ?? DEFAULT_PRIMARY_MUSCLE,
    movementPattern: MovementPattern.UNKNOWN,
    loadType: input.loadType ?? DEFAULT_LOAD_TYPE,
    defaultWeightIncrement: null,
    source: ExerciseSource.CUSTOM,
    archivedAt: null,
  };

  await exerciseRepository.add(exercise);
  return { ok: true, exercise };
}
