import { expandedExerciseSeedRows } from "./expandedExercises";
import { legacyExerciseSeedRows } from "./legacyExercises";
import type { BuiltinExerciseSeedRow } from "./types";

function validateSeedRows(rows: BuiltinExerciseSeedRow[]): void {
  const ids = new Set<string>();
  const names = new Set<string>();

  for (const [id, name] of rows) {
    if (ids.has(id)) {
      throw new Error(`Duplicate built-in exercise ID: ${id}`);
    }
    if (names.has(name)) {
      throw new Error(`Duplicate built-in exercise name: ${name}`);
    }
    ids.add(id);
    names.add(name);
  }
}

const combinedRows: BuiltinExerciseSeedRow[] = [
  ...legacyExerciseSeedRows,
  ...expandedExerciseSeedRows,
];

validateSeedRows(combinedRows);

/** Full built-in catalog, sorted alphabetically by exercise name. */
export const builtinExerciseSeedRows: BuiltinExerciseSeedRow[] = [...combinedRows].sort(
  (left, right) => left[1].localeCompare(right[1]),
);

export type { BuiltinExerciseSeedRow } from "./types";
