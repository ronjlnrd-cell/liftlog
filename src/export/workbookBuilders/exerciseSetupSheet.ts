import type { ExcelExportInput } from "../types";
import { formatLocalDateTime, sheetFromRows } from "../sheetUtils";

const HEADERS = [
  "Workout ID",
  "Workout Exercise ID",
  "Exercise",
  "Content",
  "Recorded At",
] as const;

export function buildExerciseSetupSheet(input: ExcelExportInput) {
  const rows: unknown[][] = [HEADERS.slice()];
  const exerciseNames = new Map(
    input.exercises.map((exercise) => [exercise.id, exercise.name]),
  );

  for (const entry of [...input.exerciseSetups].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )) {
    rows.push([
      entry.workoutId,
      entry.workoutExerciseId,
      exerciseNames.get(entry.exerciseId) ?? entry.exerciseId,
      entry.content,
      formatLocalDateTime(entry.createdAt),
    ]);
  }

  return sheetFromRows(rows);
}
