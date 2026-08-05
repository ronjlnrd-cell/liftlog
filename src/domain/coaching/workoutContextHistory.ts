import type { WorkoutContextEntry } from "../entities/WorkoutContextEntry";
import type { WorkoutTemplate } from "../entities/Template";
import type { Workout } from "../entities/workout";
import {
  buildTemplateOriginByWorkoutId,
  coachingEntryMatchesTemplate,
  getCoachingWorkoutTemplateContext,
} from "./coachingTemplateContext";
import { resolveCoachingEntryDate } from "./coachingHistoryUtils";

export type WorkoutContextHistoryRow = {
  id: string;
  workoutId: string;
  date: Date;
  workoutLabel: string;
  content: string;
  sourceTemplateId?: string;
};

export function getWorkoutContextHistoryRows(
  entries: WorkoutContextEntry[],
  workouts: Workout[],
  templates: WorkoutTemplate[],
  options: {
    excludeWorkoutId?: string;
    currentSourceTemplateId?: string;
    sameTemplateOnly?: boolean;
  },
): WorkoutContextHistoryRow[] {
  const templateNames = new Map(
    templates.map((template) => [template.id, template.name]),
  );
  const workoutById = new Map(workouts.map((workout) => [workout.id, workout]));
  const templateOriginByWorkoutId = buildTemplateOriginByWorkoutId(templates);
  const targetTemplateId = options.currentSourceTemplateId ?? null;

  return entries
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
        date: resolveCoachingEntryDate(
          entry.workoutId,
          entry.createdAt,
          workoutById,
        ),
        workoutLabel: templateContext.workoutLabel,
        content: entry.content,
        sourceTemplateId: templateContext.sourceTemplateId,
      };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}
