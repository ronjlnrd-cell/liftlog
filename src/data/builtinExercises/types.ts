import type { Exercise } from "../../domain/entities/Exercise";

export type BuiltinExerciseSeedRow = [
  id: string,
  name: string,
  primaryMuscle: Exercise["primaryMuscle"],
  movementPattern: Exercise["movementPattern"],
  loadType: Exercise["loadType"],
  defaultWeightIncrement: number | null,
];
