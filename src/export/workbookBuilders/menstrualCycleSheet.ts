import type { ExcelExportInput } from "../types";
import { formatLocalDate, sheetFromRows } from "../sheetUtils";

const HEADERS = ["Period Start Date", "Recorded At"] as const;

export function buildMenstrualCycleSheet(input: ExcelExportInput) {
  const rows: unknown[][] = [HEADERS.slice()];

  const sorted = [...input.periodEntries].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );

  for (const entry of sorted) {
    rows.push([formatLocalDate(`${entry.startDate}T12:00:00`), entry.createdAt]);
  }

  return sheetFromRows(rows);
}
