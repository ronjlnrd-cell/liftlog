import { exerciseRepository } from "./repositories/ExerciseRepository";
import { MuscleGroup } from "../domain/types/MuscleGroup";
import { MovementPattern } from "../domain/types/MovementPattern";
import { LoadType } from "../domain/types/LoadType";
import { ExerciseSource } from "../domain/types/exercise-source";
import type { Exercise } from "../domain/entities/Exercise";

const builtIns: Exercise[] = [
  ["builtin-bench-press", "Bench Press", MuscleGroup.CHEST, MovementPattern.HORIZONTAL_PUSH, LoadType.BARBELL],
  ["builtin-squat", "Squat", MuscleGroup.QUADRICEPS, MovementPattern.SQUAT, LoadType.BARBELL],
  ["builtin-deadlift", "Deadlift", MuscleGroup.HAMSTRINGS, MovementPattern.HINGE, LoadType.BARBELL],
  ["builtin-ohp", "Overhead Press", MuscleGroup.SHOULDERS, MovementPattern.VERTICAL_PUSH, LoadType.BARBELL],
  ["builtin-pull-up", "Pull-Up", MuscleGroup.BACK, MovementPattern.VERTICAL_PULL, LoadType.BODYWEIGHT],
  ["builtin-row", "Barbell Row", MuscleGroup.BACK, MovementPattern.HORIZONTAL_PULL, LoadType.BARBELL],
  ["builtin-dips", "Dips", MuscleGroup.CHEST, MovementPattern.HORIZONTAL_PUSH, LoadType.BODYWEIGHT],
  ["builtin-lat-pulldown", "Lat Pulldown", MuscleGroup.BACK, MovementPattern.VERTICAL_PULL, LoadType.CABLE],
  ["builtin-leg-press", "Leg Press", MuscleGroup.QUADRICEPS, MovementPattern.SQUAT, LoadType.MACHINE],
  ["builtin-biceps-curl", "Biceps Curl", MuscleGroup.BICEPS, MovementPattern.ISOLATION, LoadType.DUMBBELL],
].map(([id, name, primaryMuscle, movementPattern, loadType]) => ({
  id: id as string,
  name: name as string,
  primaryMuscle: primaryMuscle as Exercise["primaryMuscle"],
  movementPattern: movementPattern as Exercise["movementPattern"],
  loadType: loadType as Exercise["loadType"],
  defaultWeightIncrement: 2.5,
  source: ExerciseSource.BUILT_IN,
  archivedAt: null,
}));

export async function seedExercises(): Promise<void> {
  const existing = await exerciseRepository.getAll();
  const existingIds = new Set(existing.map((exercise) => exercise.id));
  await Promise.all(
    builtIns.filter((exercise) => !existingIds.has(exercise.id)).map((exercise) => exerciseRepository.add(exercise)),
  );
}
