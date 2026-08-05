import { utils, writeFile, type WorkSheet } from "xlsx";
import { getDb } from "../data/database/databaseManager";
import type { Profile } from "../domain/entities/Profile";
import { buildBodyweightSheet } from "./workbookBuilders/bodyweightSheet";
import { buildMenstrualCycleSheet } from "./workbookBuilders/menstrualCycleSheet";
import { buildCustomExerciseSheet } from "./workbookBuilders/customExerciseSheet";
import { buildExerciseSummarySheet } from "./workbookBuilders/exerciseSummarySheet";
import { buildTemplateSheet } from "./workbookBuilders/templateSheet";
import { buildWorkoutLogSheet } from "./workbookBuilders/workoutSheet";
import { buildWorkoutContextSheet } from "./workbookBuilders/workoutContextSheet";
import { buildExerciseSetupSheet } from "./workbookBuilders/exerciseSetupSheet";
import { buildCoachObservationSheet } from "./workbookBuilders/coachObservationSheet";
import { localExportDateStamp } from "./sheetUtils";
import type { ExcelExportInput } from "./types";

type BuiltSheet = {
  rows: unknown[][];
  columnWidths: { wch: number }[];
};

function appendSheet(
  workbook: ReturnType<typeof utils.book_new>,
  name: string,
  sheet: BuiltSheet,
): void {
  const worksheet: WorkSheet = utils.aoa_to_sheet(sheet.rows);
  worksheet["!cols"] = sheet.columnWidths;
  utils.book_append_sheet(workbook, worksheet, name);
}

export function buildTrainingWorkbook(input: ExcelExportInput) {
  const workbook = utils.book_new();

  appendSheet(workbook, "Workout Log", buildWorkoutLogSheet(input));
  appendSheet(workbook, "Exercise Summary", buildExerciseSummarySheet(input));
  appendSheet(workbook, "Workout Context", buildWorkoutContextSheet(input));
  appendSheet(workbook, "Exercise Setup", buildExerciseSetupSheet(input));
  appendSheet(workbook, "Coach Observations", buildCoachObservationSheet(input));
  appendSheet(workbook, "Bodyweight", buildBodyweightSheet(input));
  if (input.periodEntries.length > 0) {
    appendSheet(workbook, "Menstrual Cycle", buildMenstrualCycleSheet(input));
  }
  appendSheet(workbook, "Templates", buildTemplateSheet(input));
  appendSheet(workbook, "Custom Exercises", buildCustomExerciseSheet(input));

  return workbook;
}

export function exportFilename(): string {
  return `Stronger Export ${localExportDateStamp()}.xlsx`;
}

async function loadExportInput(): Promise<ExcelExportInput> {
  const db = getDb();
  const [
    workouts,
    exercises,
    templates,
    bodyweights,
    periodEntries,
    workoutContexts,
    exerciseSetups,
    coachObservations,
    profileRows,
  ] = await Promise.all([
    db.workouts.toArray(),
    db.exercises.toArray(),
    db.templates.toArray(),
    db.bodyweightEntries.toArray(),
    db.periodEntries.toArray(),
    db.workoutContextEntries.toArray(),
    db.exerciseSetupEntries.toArray(),
    db.coachObservationEntries.toArray(),
    db.profile.toArray(),
  ]);

  const profile: Profile = profileRows[0] ?? {
    id: "profile",
    gender: "UNSPECIFIED",
    weightUnit: "KG",
  };

  return {
    workouts,
    exercises,
    templates,
    bodyweights,
    periodEntries,
    workoutContexts,
    exerciseSetups,
    coachObservations,
    profile,
  };
}

export async function exportTrainingDataToExcel(): Promise<void> {
  const input = await loadExportInput();
  const workbook = buildTrainingWorkbook(input);
  writeFile(workbook, exportFilename());
}
