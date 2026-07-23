import { MuscleGroup } from "../types/MuscleGroup";
import { MovementPattern } from "../types/MovementPattern";
import { LoadType } from "../types/LoadType";
import { ExerciseSource } from "../types/exercise-source";

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  movementPattern: MovementPattern;
  loadType: LoadType;
  defaultWeightIncrement: number | null;
  source: ExerciseSource;
  archivedAt: Date | null;
}