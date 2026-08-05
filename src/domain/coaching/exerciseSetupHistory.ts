import type { ExerciseSetupEntry } from "../entities/ExerciseSetupEntry";
import type { WorkoutTemplate } from "../entities/Template";
import type { Workout } from "../entities/workout";
import {
  buildTemplateOriginByWorkoutId,
  coachingEntryMatchesTemplate,
  getCoachingWorkoutTemplateContext,
} from "./coachingTemplateContext";

export type ExerciseSetupHistoryRow = {
  id: string;
  workoutId: string;
  date: Date;
  workoutLabel: string;
  content: string;
  sourceTemplateId?: string;
};

export function getExerciseSetupHistoryRows(
  entries: ExerciseSetupEntry[],
  workouts: Workout[],
  templates: WorkoutTemplate[],
  options: {
    exerciseId: string;
    excludeWorkoutId?: string;
    currentSourceTemplateId?: string;
    sameTemplateOnly?: boolean;
  },
): ExerciseSetupHistoryRow[] {
  const templateNames = new Map(
    templates.map((template) => [template.id, template.name]),
  );
  const workoutById = new Map(workouts.map((workout) => [workout.id, workout]));
  const templateOriginByWorkoutId = buildTemplateOriginByWorkoutId(templates);
  const targetTemplateId = options.currentSourceTemplateId ?? null;

  return entries
    .filter((entry) => entry.exerciseId === options.exerciseId)
    .filter((entry) => entry.workoutId !== options.excludeWorkoutId)
    .filter((entry) => {
      if (!options.sameTemplateOnly) return true;

      return coachingEntryMatchesTemplate(
        entry.workoutId,
        targetTemplateId,
        workouts,
        templates,
        entry.sourceTemplateId,
      );
    })
    .map((entry) => {
      const workout = workoutById.get(entry.workoutId);
      const date = workout
        ? workout.completedAt ?? workout.startedAt
        : new Date(entry.createdAt);
      const templateContext = getCoachingWorkoutTemplateContext(
        entry.workoutId,
        workouts,
        templates,
        templateNames,
        templateOriginByWorkoutId,
        entry.sourceTemplateId,
      );

      return {
        id: entry.id,
        workoutId: entry.workoutId,
        date,
        workoutLabel: templateContext.workoutLabel,
        content: entry.content,
        sourceTemplateId: templateContext.sourceTemplateId,
      };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}
