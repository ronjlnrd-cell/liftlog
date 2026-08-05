import type { ExcelExportInput } from "../types";
import { formatLocalDateTime, sheetFromRows } from "../sheetUtils";

const HEADERS = [
  "Workout ID",
  "Workout Exercise ID",
  "Exercise",
  "Set",
  "Content",
  "Recorded At",
] as const;

export function buildCoachObservationSheet(input: ExcelExportInput) {
  const rows: unknown[][] = [HEADERS.slice()];
  const exerciseNames = new Map(
    input.exercises.map((exercise) => [exercise.id, exercise.name]),
  );

  for (const entry of [...input.coachObservations].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )) {
    rows.push([
      entry.workoutId,
      entry.workoutExerciseId,
      exerciseNames.get(entry.exerciseId) ?? entry.exerciseId,
      entry.setOrder + 1,
      entry.content,
      formatLocalDateTime(entry.createdAt),
    ]);
  }

  return sheetFromRows(rows);
}
