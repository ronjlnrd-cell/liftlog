import { ExerciseSource } from "../../domain/types/exercise-source";
import type { ExcelExportInput } from "../types";
import {
  formatEnumLabel,
  formatNumber,
  formatYesNo,
  sheetFromRows,
} from "../sheetUtils";

const HEADERS = [
  "Exercise",
  "Primary muscle",
  "Movement pattern",
  "Load type",
  "Default weight increment",
  "Archived",
] as const;

export function buildCustomExerciseSheet(input: ExcelExportInput) {
  const rows: unknown[][] = [HEADERS.slice()];

  const customExercises = input.exercises
    .filter((exercise) => exercise.source === ExerciseSource.CUSTOM)
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const exercise of customExercises) {
    rows.push([
      exercise.name,
      formatEnumLabel(exercise.primaryMuscle),
      formatEnumLabel(exercise.movementPattern),
      formatEnumLabel(exercise.loadType),
      exercise.defaultWeightIncrement == null
        ? ""
        : formatNumber(exercise.defaultWeightIncrement, 1),
      formatYesNo(exercise.archivedAt != null),
    ]);
  }

  return sheetFromRows(rows);
}
