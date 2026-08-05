import type { CoachObservationEntry } from "../entities/CoachObservationEntry";
import type { WorkoutTemplate } from "../entities/Template";
import type { Workout } from "../entities/workout";
import {
  buildTemplateOriginByWorkoutId,
  coachingEntryMatchesTemplate,
  getCoachingWorkoutTemplateContext,
} from "./coachingTemplateContext";
import { resolveCoachingEntryDate } from "./coachingHistoryUtils";

export type CoachObservationHistoryRow = {
  id: string;
  workoutId: string;
  date: Date;
  workoutLabel: string;
  setOrder: number;
  content: string;
  sourceTemplateId?: string;
};

export function getCoachObservationHistoryRows(
  entries: CoachObservationEntry[],
  workouts: Workout[],
  templates: WorkoutTemplate[],
  options: {
    exerciseId: string;
    excludeWorkoutId?: string;
    currentSourceTemplateId?: string;
    sameTemplateOnly?: boolean;
  },
): CoachObservationHistoryRow[] {
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
        setOrder: entry.setOrder,
        content: entry.content,
        sourceTemplateId: templateContext.sourceTemplateId,
      };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}
