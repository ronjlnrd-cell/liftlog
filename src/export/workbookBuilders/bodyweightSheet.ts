import type { ExcelExportInput } from "../types";
import { formatLocalDate, formatNumber, sheetFromRows } from "../sheetUtils";

const HEADERS = ["Date", "Bodyweight"] as const;

export function buildBodyweightSheet(input: ExcelExportInput) {
  const rows: unknown[][] = [HEADERS.slice()];

  const sorted = [...input.bodyweights].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt),
  );

  for (const entry of sorted) {
    rows.push([formatLocalDate(entry.recordedAt), formatNumber(entry.weight, 1)]);
  }

  return sheetFromRows(rows);
}
