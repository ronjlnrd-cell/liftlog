import type { ColInfo } from "xlsx";
import { formatLabel } from "../shared";

export function formatEnumLabel(value: string): string {
  return formatLabel(value);
}

export function formatYesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

export function formatNumber(value: number | null | undefined, digits = 2): number | "" {
  if (value == null || Number.isNaN(value)) return "";
  return Number(value.toFixed(digits));
}

export function formatLocalDate(value: Date | string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatLocalDateTime(value: Date | string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatRestSeconds(seconds: number): string {
  if (seconds <= 0) return "";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (remainder === 0) return `${minutes}m`;
  return `${minutes}m ${remainder}s`;
}

export function formatWorkoutDuration(
  startedAt: Date,
  completedAt: Date | null,
): string {
  if (!completedAt) return "";

  const totalMinutes = Math.max(
    0,
    Math.round(
      (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60_000,
    ),
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function localExportDateStamp(): string {
  return formatLocalDate(new Date());
}

export function autoSizeColumns(rows: unknown[][]): ColInfo[] {
  const columnCount = rows.reduce(
    (max, row) => Math.max(max, row.length),
    0,
  );
  const widths = Array.from({ length: columnCount }, () => 10);

  for (const row of rows) {
    row.forEach((cell, index) => {
      const length = String(cell ?? "").length;
      widths[index] = Math.max(widths[index], length);
    });
  }

  return widths.map((width) => ({
    wch: Math.min(Math.max(width + 2, 10), 48),
  }));
}

export function sheetFromRows(rows: unknown[][]) {
  return {
    rows,
    columnWidths: autoSizeColumns(rows),
  };
}
