import type { Exercise } from "../entities/Exercise";
import type { WorkoutExercise } from "../entities/workout";

export type ProgressionOption = {
  label: string;
  detail: string;
  recommended?: boolean;
  nextWeight: number;
  reps: number;
  sets: number;
  restSeconds?: number;
};

export type ProgressionRecommendation = {
  options: ProgressionOption[];
};

function roundWeight(value: number): number {
  return Math.round(value * 100) / 100;
}

export function plannedWorkoutSucceeded(item: WorkoutExercise): boolean {
  if (item.plannedSets.length === 0) {
    return item.completedSets.length > 0;
  }
  if (item.completedSets.length < item.plannedSets.length) return false;

  return item.plannedSets.every((planned, index) => {
    const completed = item.completedSets[index];
    if (!completed) return false;
    return (
      (planned.weight == null || completed.weight >= planned.weight) &&
      completed.reps >= planned.reps
    );
  });
}

export function getProgressionRecommendation(
  item: WorkoutExercise,
  exercise: Exercise,
): ProgressionRecommendation | null {
  if (!plannedWorkoutSucceeded(item) || item.completedSets.length === 0) {
    return null;
  }

  const baselineWeight = Math.max(...item.completedSets.map((set) => set.weight));
  const baselineReps = Math.min(...item.completedSets.map((set) => set.reps));
  const baselineSets = item.completedSets.length;
  const increment =
    exercise.defaultWeightIncrement && exercise.defaultWeightIncrement > 0
      ? exercise.defaultWeightIncrement
      : 2.5;
  const increasedReps = Math.max(
    baselineReps + 1,
    Math.ceil(baselineReps * 1.15),
  );

  const options: ProgressionOption[] = [
    {
      label: "Add weight",
      detail: `${roundWeight(baselineWeight + increment)} × ${baselineReps} × ${baselineSets}`,
      recommended: true,
      nextWeight: roundWeight(baselineWeight + increment),
      reps: baselineReps,
      sets: baselineSets,
      restSeconds: item.plannedRestSeconds,
    },
    {
      label: "Add reps",
      detail: `${baselineWeight} × ${increasedReps} × ${baselineSets}`,
      nextWeight: baselineWeight,
      reps: increasedReps,
      sets: baselineSets,
      restSeconds: item.plannedRestSeconds,
    },
  ];

  if (baselineSets < 4) {
    options.push({
      label: "Add a set",
      detail: `${baselineWeight} × ${baselineReps} × ${baselineSets + 1}`,
      nextWeight: baselineWeight,
      reps: baselineReps,
      sets: baselineSets + 1,
      restSeconds: item.plannedRestSeconds,
    });
  }

  if (item.plannedRestSeconds > 90) {
    options.push({
      label: "Reduce rest",
      detail: `${baselineWeight} × ${baselineReps} × ${baselineSets} · ${item.plannedRestSeconds - 15}s rest`,
      nextWeight: baselineWeight,
      reps: baselineReps,
      sets: baselineSets,
      restSeconds: item.plannedRestSeconds - 15,
    });
  }

  return { options };
}
