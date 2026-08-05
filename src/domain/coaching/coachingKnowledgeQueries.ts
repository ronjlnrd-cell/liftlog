import type { CoachObservationEntry } from "../entities/CoachObservationEntry";
import type { ExerciseSetupEntry } from "../entities/ExerciseSetupEntry";
import type { WorkoutContextEntry } from "../entities/WorkoutContextEntry";
import type { WorkoutTemplate } from "../entities/Template";
import type { Workout } from "../entities/workout";
import { coachingEntryMatchesTemplate } from "./coachingTemplateContext";
export function getWorkoutContextForWorkout(
  entries: WorkoutContextEntry[],
  workoutId: string,
): WorkoutContextEntry | null {
  return (
    entries.find((entry) => entry.workoutId === workoutId) ?? null
  );
}

export function getExerciseSetupForWorkoutExercise(
  entries: ExerciseSetupEntry[],
  workoutExerciseId: string,
): ExerciseSetupEntry | null {
  return (
    entries.find((entry) => entry.workoutExerciseId === workoutExerciseId) ??
    null
  );
}

export function getLatestExerciseSetupForExercise(
  entries: ExerciseSetupEntry[],
  exerciseId: string,
  options?: {
    excludeWorkoutExerciseId?: string;
    sourceTemplateId?: string;
    workouts?: Workout[];
    templates?: WorkoutTemplate[];
  },
): ExerciseSetupEntry | null {
  const excludeWorkoutExerciseId = options?.excludeWorkoutExerciseId;
  const sourceTemplateId = options?.sourceTemplateId;
  const workouts = options?.workouts;
  const templates = options?.templates;

  return (
    entries
      .filter((entry) => {
        if (entry.exerciseId !== exerciseId) return false;
        if (entry.workoutExerciseId === excludeWorkoutExerciseId) return false;

        if (sourceTemplateId && workouts && templates) {
          return coachingEntryMatchesTemplate(
            entry.workoutId,
            sourceTemplateId,
            workouts,
            templates,
            entry.sourceTemplateId,
          );
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0] ?? null
  );
}

export function getEffectiveExerciseSetup(
  entries: ExerciseSetupEntry[],
  workoutExerciseId: string,
  exerciseId: string,
  options?: {
    sourceTemplateId?: string;
    workouts?: Workout[];
    templates?: WorkoutTemplate[];
  },
): {
  entry: ExerciseSetupEntry | null;
  content: string | null;
  isInherited: boolean;
} {
  const current = getExerciseSetupForWorkoutExercise(
    entries,
    workoutExerciseId,
  );
  if (current) {
    return { entry: current, content: current.content, isInherited: false };
  }

  const latest = getLatestExerciseSetupForExercise(entries, exerciseId, {
    excludeWorkoutExerciseId: workoutExerciseId,
    sourceTemplateId: options?.sourceTemplateId,
    workouts: options?.workouts,
    templates: options?.templates,
  });
  if (latest) {
    return { entry: null, content: latest.content, isInherited: true };
  }

  if (options?.sourceTemplateId) {
    const globalLatest = getLatestExerciseSetupForExercise(entries, exerciseId, {
      excludeWorkoutExerciseId: workoutExerciseId,
    });
    if (globalLatest) {
      return { entry: null, content: globalLatest.content, isInherited: true };
    }
  }

  return { entry: null, content: null, isInherited: false };
}

export function summarizeExerciseSetup(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= 72) return normalized;
  return `${normalized.slice(0, 69).trimEnd()}…`;
}

export function getCoachObservationsForSet(
  entries: CoachObservationEntry[],
  workoutExerciseId: string,
  setOrder: number,
): CoachObservationEntry[] {
  return entries
    .filter(
      (entry) =>
        entry.workoutExerciseId === workoutExerciseId &&
        entry.setOrder === setOrder,
    )
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

export function getCoachObservationsForWorkoutExercise(
  entries: CoachObservationEntry[],
  workoutExerciseId: string,
): CoachObservationEntry[] {
  return entries
    .filter((entry) => entry.workoutExerciseId === workoutExerciseId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}


export function formatCoachObservationLabel(
  entry: CoachObservationEntry,
): string {
  return `Set ${entry.setOrder + 1}: ${entry.content}`;
}

export function getWorkoutCoachingKnowledge(
  workoutId: string,
  workoutContexts: WorkoutContextEntry[],
  exerciseSetups: ExerciseSetupEntry[],
  coachObservations: CoachObservationEntry[],
  workout: Workout,
  options?: {
    workouts?: Workout[];
    templates?: WorkoutTemplate[];
  },
) {
  const context = getWorkoutContextForWorkout(workoutContexts, workoutId);
  const exercises = workout.exercises.map((item) => {
    const setup = getEffectiveExerciseSetup(
      exerciseSetups,
      item.id,
      item.exerciseId,
      {
        sourceTemplateId: workout.sourceTemplateId,
        workouts: options?.workouts,
        templates: options?.templates,
      },
    );
    return {
      item,
      setup: setup.content,
      observations: getCoachObservationsForWorkoutExercise(
        coachObservations,
        item.id,
      ),
    };
  });

  return { context, exercises };
}
