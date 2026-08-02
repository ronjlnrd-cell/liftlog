import type { Exercise } from "../entities/Exercise";
import type { Workout, WorkoutExercise } from "../entities/workout";
import { plannedWorkoutSucceeded } from "./progression";

export type ProgressionCoachSuggestionType =
  | "increase-weight"
  | "same-weight"
  | "increase-reps";

export type ProgressionCoachSuggestion = {
  type: ProgressionCoachSuggestionType;
  label: string;
  detail: string;
  recommended?: boolean;
  nextWeight: number;
  reps: number;
  sets: number;
};

export type PlannedVsCompletedSummary = {
  headline: string;
  detail: string;
};

export type ProgressionCoachExerciseAdvice = {
  exerciseId: string;
  comparison: PlannedVsCompletedSummary;
  suggestions: ProgressionCoachSuggestion[];
};

function roundWeight(value: number): number {
  return Math.round(value * 100) / 100;
}

function getCompletedBaseline(item: WorkoutExercise) {
  return {
    weight: Math.max(...item.completedSets.map((set) => set.weight)),
    reps: Math.min(...item.completedSets.map((set) => set.reps)),
    sets: item.completedSets.length,
  };
}

export function summarizePlannedVsCompleted(
  item: WorkoutExercise,
): PlannedVsCompletedSummary {
  if (item.plannedSets.length === 0) {
    return {
      headline: "Free logging",
      detail: `${item.completedSets.length} set${
        item.completedSets.length === 1 ? "" : "s"
      } completed with no planned targets.`,
    };
  }

  if (item.completedSets.length < item.plannedSets.length) {
    return {
      headline: "Incomplete",
      detail: `Completed ${item.completedSets.length} of ${item.plannedSets.length} planned sets.`,
    };
  }

  const missedSets = item.plannedSets.filter((planned, index) => {
    const completed = item.completedSets[index];
    if (!completed) return true;
    return (
      (planned.weight != null && completed.weight < planned.weight) ||
      completed.reps < planned.reps
    );
  });

  if (missedSets.length > 0) {
    return {
      headline: "Partially matched",
      detail: `Missed planned targets on ${missedSets.length} of ${item.plannedSets.length} sets.`,
    };
  }

  return {
    headline: "Targets hit",
    detail: `Hit weight and reps on all ${item.plannedSets.length} planned sets.`,
  };
}

export function getProgressionCoachExerciseAdvice(
  item: WorkoutExercise,
  exercise: Exercise,
): ProgressionCoachExerciseAdvice | null {
  if (item.completedSets.length === 0) return null;

  const baseline = getCompletedBaseline(item);
  const increment =
    exercise.defaultWeightIncrement && exercise.defaultWeightIncrement > 0
      ? exercise.defaultWeightIncrement
      : 2.5;
  const increasedReps = Math.max(
    baseline.reps + 1,
    Math.ceil(baseline.reps * 1.15),
  );
  const succeeded = plannedWorkoutSucceeded(item);

  const sameWeight: ProgressionCoachSuggestion = {
    type: "same-weight",
    label: "Stay at same weight",
    detail: `${roundWeight(baseline.weight)} × ${baseline.reps} × ${baseline.sets}`,
    nextWeight: roundWeight(baseline.weight),
    reps: baseline.reps,
    sets: baseline.sets,
  };

  const increaseWeight: ProgressionCoachSuggestion = {
    type: "increase-weight",
    label: "Increase weight",
    detail: `${roundWeight(baseline.weight + increment)} × ${baseline.reps} × ${baseline.sets}`,
    nextWeight: roundWeight(baseline.weight + increment),
    reps: baseline.reps,
    sets: baseline.sets,
  };

  const increaseReps: ProgressionCoachSuggestion = {
    type: "increase-reps",
    label: "Increase reps",
    detail: `${roundWeight(baseline.weight)} × ${increasedReps} × ${baseline.sets}`,
    nextWeight: roundWeight(baseline.weight),
    reps: increasedReps,
    sets: baseline.sets,
  };

  if (succeeded) {
    return {
      exerciseId: item.exerciseId,
      comparison: summarizePlannedVsCompleted(item),
      suggestions: [
        { ...increaseWeight, recommended: true },
        increaseReps,
        sameWeight,
      ],
    };
  }

  return {
    exerciseId: item.exerciseId,
    comparison: summarizePlannedVsCompleted(item),
    suggestions: [
      { ...sameWeight, recommended: true },
      increaseReps,
    ],
  };
}

export function getProgressionCoachPlan(
  workout: Workout,
  exercises: Exercise[],
): ProgressionCoachExerciseAdvice[] {
  return workout.exercises.flatMap((item) => {
    const exercise = exercises.find(
      (candidate) => candidate.id === item.exerciseId,
    );
    if (!exercise) return [];

    const advice = getProgressionCoachExerciseAdvice(item, exercise);
    return advice ? [advice] : [];
  });
}
