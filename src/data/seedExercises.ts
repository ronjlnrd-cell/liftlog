import { exerciseRepository } from "./repositories/ExerciseRepository";
import { ExerciseSource } from "../domain/types/exercise-source";
import type { Exercise } from "../domain/entities/Exercise";
import { builtinExerciseSeedRows } from "./builtinExercises";

const builtIns: Exercise[] = builtinExerciseSeedRows.map(
  ([id, name, primaryMuscle, movementPattern, loadType, defaultWeightIncrement]) => ({
    id,
    name,
    primaryMuscle,
    movementPattern,
    loadType,
    defaultWeightIncrement,
    source: ExerciseSource.BUILT_IN,
    archivedAt: null,
  }),
);

export async function seedExercises(): Promise<void> {
  const existing = await exerciseRepository.getAll();
  const existingIds = new Set(existing.map((exercise) => exercise.id));
  await Promise.all(
    builtIns
      .filter((exercise) => !existingIds.has(exercise.id))
      .map((exercise) => exerciseRepository.add(exercise)),
  );
}

export { builtIns };
