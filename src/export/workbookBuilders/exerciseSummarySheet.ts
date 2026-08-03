import { estimated1RM } from "../../domain/analytics/personalRecords";
import type { ExcelExportInput } from "../types";
import { formatLocalDate, formatNumber, sheetFromRows } from "../sheetUtils";

const HEADERS = [
  "Exercise",
  "Sessions",
  "Total sets",
  "Total reps",
  "Total volume",
  "Best weight",
  "Best estimated 1RM",
  "First performed",
  "Last performed",
] as const;

export function buildExerciseSummarySheet(input: ExcelExportInput) {
  const exerciseNameById = new Map(
    input.exercises.map((exercise) => [exercise.id, exercise.name]),
  );

  type Summary = {
    sessions: Set<string>;
    totalSets: number;
    totalReps: number;
    totalVolume: number;
    bestWeight: number;
    bestEstimated1RM: number;
    firstPerformed: Date | null;
    lastPerformed: Date | null;
  };

  const summaries = new Map<string, Summary>();

  const completedWorkouts = input.workouts.filter(
    (workout) => workout.completedAt != null,
  );

  for (const workout of completedWorkouts) {
    const workoutDate = new Date(workout.startedAt);

    for (const item of workout.exercises) {
      if (item.completedSets.length === 0) continue;

      const summary =
        summaries.get(item.exerciseId) ??
        ({
          sessions: new Set<string>(),
          totalSets: 0,
          totalReps: 0,
          totalVolume: 0,
          bestWeight: 0,
          bestEstimated1RM: 0,
          firstPerformed: null,
          lastPerformed: null,
        } satisfies Summary);

      summary.sessions.add(workout.id);

      for (const set of item.completedSets) {
        summary.totalSets += 1;
        summary.totalReps += set.reps;
        summary.totalVolume += set.weight * set.reps;
        summary.bestWeight = Math.max(summary.bestWeight, set.weight);
        summary.bestEstimated1RM = Math.max(
          summary.bestEstimated1RM,
          estimated1RM(set),
        );
      }

      if (!summary.firstPerformed || workoutDate < summary.firstPerformed) {
        summary.firstPerformed = workoutDate;
      }
      if (!summary.lastPerformed || workoutDate > summary.lastPerformed) {
        summary.lastPerformed = workoutDate;
      }

      summaries.set(item.exerciseId, summary);
    }
  }

  const rows: unknown[][] = [HEADERS.slice()];

  const sortedExerciseIds = [...summaries.keys()].sort((a, b) => {
    const nameA = exerciseNameById.get(a) ?? a;
    const nameB = exerciseNameById.get(b) ?? b;
    return nameA.localeCompare(nameB);
  });

  for (const exerciseId of sortedExerciseIds) {
    const summary = summaries.get(exerciseId)!;
    rows.push([
      exerciseNameById.get(exerciseId) ?? exerciseId,
      summary.sessions.size,
      summary.totalSets,
      summary.totalReps,
      formatNumber(summary.totalVolume, 1),
      formatNumber(summary.bestWeight, 1),
      formatNumber(summary.bestEstimated1RM, 1),
      summary.firstPerformed ? formatLocalDate(summary.firstPerformed) : "",
      summary.lastPerformed ? formatLocalDate(summary.lastPerformed) : "",
    ]);
  }

  return sheetFromRows(rows);
}
