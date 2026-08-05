import type { ExcelExportInput } from "../types";
import { formatLocalDateTime, sheetFromRows } from "../sheetUtils";

const HEADERS = [
  "Workout ID",
  "Workout Started",
  "Content",
  "Recorded At",
] as const;

export function buildWorkoutContextSheet(input: ExcelExportInput) {
  const rows: unknown[][] = [HEADERS.slice()];
  const workoutDates = new Map(
    input.workouts.map((workout) => [
      workout.id,
      workout.startedAt,
    ]),
  );

  for (const entry of [...input.workoutContexts].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )) {
    rows.push([
      entry.workoutId,
      workoutDates.get(entry.workoutId)
        ? formatLocalDateTime(workoutDates.get(entry.workoutId)!)
        : "",
      entry.content,
      formatLocalDateTime(entry.createdAt),
    ]);
  }

  return sheetFromRows(rows);
}
