import { getWorkoutPRs, estimated1RM, setKey } from "../../domain/analytics/personalRecords";
import type { ExcelExportInput } from "../types";
import {
  formatLocalDate,
  formatNumber,
  formatRestSeconds,
  formatWorkoutDuration,
  formatYesNo,
  sheetFromRows,
} from "../sheetUtils";

const HEADERS = [
  "Date",
  "Workout",
  "Exercise",
  "Set #",
  "Weight",
  "Reps",
  "Volume",
  "Rest time",
  "Bodyweight",
  "Workout duration",
  "PR achieved",
] as const;

function workoutLabel(
  workout: ExcelExportInput["workouts"][number],
  templateNameById: Map<string, string>,
): string {
  if (workout.sourceTemplateId) {
    const templateName = templateNameById.get(workout.sourceTemplateId);
    if (templateName) return templateName;
  }

  return `Workout ${formatLocalDate(workout.startedAt)}`;
}

export function buildWorkoutLogSheet(input: ExcelExportInput) {
  const exerciseNameById = new Map(
    input.exercises.map((exercise) => [exercise.id, exercise.name]),
  );
  const templateNameById = new Map(
    input.templates.map((template) => [template.id, template.name]),
  );
  const prs = getWorkoutPRs(input.workouts);

  const rows: unknown[][] = [HEADERS.slice()];

  const completedWorkouts = [...input.workouts]
    .filter((workout) => workout.completedAt != null)
    .sort(
      (a, b) =>
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );

  for (const workout of completedWorkouts) {
    const workoutName = workoutLabel(workout, templateNameById);
    const duration = formatWorkoutDuration(workout.startedAt, workout.completedAt);
    const date = formatLocalDate(workout.startedAt);
    const bodyweight =
      workout.bodyweight == null ? "" : formatNumber(workout.bodyweight, 1);

    const items = [...workout.exercises].sort((a, b) => a.order - b.order);

    for (const item of items) {
      const exerciseName =
        exerciseNameById.get(item.exerciseId) ?? item.exerciseId;
      const restTime = formatRestSeconds(item.plannedRestSeconds);

      for (const set of [...item.completedSets].sort(
        (a, b) => a.order - b.order,
      )) {
        const volume = set.weight * set.reps;
        const isPr = prs.has(setKey(workout.id, item.id, set.order));

        rows.push([
          date,
          workoutName,
          exerciseName,
          set.order,
          formatNumber(set.weight, 1),
          set.reps,
          formatNumber(volume, 1),
          restTime,
          bodyweight,
          duration,
          formatYesNo(isPr),
        ]);
      }
    }
  }

  return sheetFromRows(rows);
}
