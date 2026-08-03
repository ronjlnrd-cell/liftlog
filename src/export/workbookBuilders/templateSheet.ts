import type { ExcelExportInput } from "../types";
import {
  formatLocalDate,
  formatNumber,
  formatRestSeconds,
  sheetFromRows,
} from "../sheetUtils";

const HEADERS = [
  "Template",
  "Created",
  "Exercise",
  "Exercise order",
  "Set #",
  "Weight",
  "Reps",
  "Rest time",
] as const;

export function buildTemplateSheet(input: ExcelExportInput) {
  const exerciseNameById = new Map(
    input.exercises.map((exercise) => [exercise.id, exercise.name]),
  );

  const rows: unknown[][] = [HEADERS.slice()];

  const sortedTemplates = [...input.templates].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  for (const template of sortedTemplates) {
    const created = formatLocalDate(template.createdAt);
    const items = [...template.exercises].sort((a, b) => a.order - b.order);

    if (items.length === 0) {
      rows.push([template.name, created, "", "", "", "", "", ""]);
      continue;
    }

    for (const item of items) {
      const exerciseName =
        exerciseNameById.get(item.exerciseId) ?? item.exerciseId;
      const restTime = formatRestSeconds(item.plannedRestSeconds);
      const sets = [...item.plannedSets].sort((a, b) => a.order - b.order);

      if (sets.length === 0) {
        rows.push([
          template.name,
          created,
          exerciseName,
          item.order,
          "",
          "",
          "",
          restTime,
        ]);
        continue;
      }

      for (const set of sets) {
        rows.push([
          template.name,
          created,
          exerciseName,
          item.order,
          set.order,
          set.weight == null ? "" : formatNumber(set.weight, 1),
          set.reps == null ? "" : set.reps,
          restTime,
        ]);
      }
    }
  }

  return sheetFromRows(rows);
}
