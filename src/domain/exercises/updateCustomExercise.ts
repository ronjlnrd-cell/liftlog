import { exerciseRepository } from "../../data/repositories/ExerciseRepository";
import type { Exercise } from "../entities/Exercise";
import { ExerciseSource } from "../types/exercise-source";
import type { MuscleGroup } from "../types/MuscleGroup";
import type { LoadType } from "../types/LoadType";

export type UpdateCustomExerciseInput = {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  loadType: LoadType;
};

export type UpdateCustomExerciseResult =
  | { ok: true; exercise: Exercise }
  | { ok: false; error: string };

export async function updateCustomExercise(
  input: UpdateCustomExerciseInput,
  existing: Exercise[],
): Promise<UpdateCustomExerciseResult> {
  const exercise = existing.find((item) => item.id === input.id);
  if (!exercise) {
    return { ok: false, error: "Exercise not found." };
  }

  if (exercise.source !== ExerciseSource.CUSTOM) {
    return { ok: false, error: "Only custom exercises can be edited." };
  }

  const trimmed = input.name.trim();
  if (!trimmed) {
    return { ok: false, error: "Exercise name is required." };
  }

  if (
    existing.some(
      (item) =>
        item.id !== input.id &&
        item.name.toLowerCase() === trimmed.toLowerCase() &&
        !item.archivedAt,
    )
  ) {
    return { ok: false, error: "An exercise with this name already exists." };
  }

  const updated: Exercise = {
    ...exercise,
    name: trimmed,
    primaryMuscle: input.primaryMuscle,
    loadType: input.loadType,
  };

  await exerciseRepository.add(updated);
  return { ok: true, exercise: updated };
}
