import type { WorkoutTemplate } from "../entities/Template";
import type { Workout } from "../entities/workout";

export type CoachingWorkoutTemplateContext = {
  sourceTemplateId?: string;
  workoutLabel: string;
};

export function buildTemplateOriginByWorkoutId(
  templates: WorkoutTemplate[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const template of templates) {
    const originWorkoutId = normalizeId(template.originWorkoutId);
    if (originWorkoutId) {
      map.set(originWorkoutId, template.id);
    }
  }
  return map;
}

export function buildWorkoutsForCoachingContext(
  activeWorkout: Workout | null | undefined,
  completedWorkouts: Workout[],
): Workout[] {
  if (!activeWorkout) return completedWorkouts;
  return [
    activeWorkout,
    ...completedWorkouts.filter((workout) => workout.id !== activeWorkout.id),
  ];
}

function normalizeId(value: string | undefined | null): string | null {
  if (!value) return null;
  return value.trim().toLowerCase();
}

export function resolveWorkoutSourceTemplateId(
  workout: Workout | undefined,
  workoutId: string,
  templates: WorkoutTemplate[],
  templateOriginByWorkoutId?: Map<string, string>,
): string | null {
  const normalizedWorkoutId = normalizeId(workoutId);
  if (!normalizedWorkoutId) return null;

  const originTemplate = templates.find(
    (template) =>
      normalizeId(template.originWorkoutId) === normalizedWorkoutId,
  );
  if (originTemplate) {
    return originTemplate.id;
  }

  if (workout?.sourceTemplateId) {
    return workout.sourceTemplateId;
  }

  const originMap =
    templateOriginByWorkoutId ?? buildTemplateOriginByWorkoutId(templates);
  return originMap.get(normalizedWorkoutId) ?? null;
}

export function resolveCoachingEntrySourceTemplateId(
  entryWorkoutId: string,
  entrySourceTemplateId: string | undefined,
  workouts: Workout[],
  templates: WorkoutTemplate[],
  templateOriginByWorkoutId?: Map<string, string>,
): string | null {
  if (entrySourceTemplateId) {
    return entrySourceTemplateId;
  }

  const workoutById = new Map(workouts.map((workout) => [workout.id, workout]));
  return resolveWorkoutSourceTemplateId(
    workoutById.get(entryWorkoutId),
    entryWorkoutId,
    templates,
    templateOriginByWorkoutId,
  );
}

export function getCoachingWorkoutTemplateContext(
  workoutId: string,
  workouts: Workout[],
  templates: WorkoutTemplate[],
  templateNames?: Map<string, string>,
  templateOriginByWorkoutId?: Map<string, string>,
  entrySourceTemplateId?: string,
): CoachingWorkoutTemplateContext {
  const names =
    templateNames ?? new Map(templates.map((template) => [template.id, template.name]));
  const workoutById = new Map(workouts.map((workout) => [workout.id, workout]));
  const sourceTemplateId =
    resolveCoachingEntrySourceTemplateId(
      workoutId,
      entrySourceTemplateId,
      workouts,
      templates,
      templateOriginByWorkoutId,
    ) ?? undefined;

  const workoutLabel = sourceTemplateId
    ? templates.find(
        (template) => normalizeId(template.id) === normalizeId(sourceTemplateId),
      )?.name ??
      names.get(sourceTemplateId) ??
      "Template workout"
    : workoutById.has(workoutId)
      ? "New workout"
      : "Unknown workout";

  return { sourceTemplateId, workoutLabel };
}

export function coachingEntryMatchesTemplate(
  entryWorkoutId: string,
  targetTemplateId: string | null,
  workouts: Workout[],
  templates: WorkoutTemplate[],
  entrySourceTemplateId?: string,
): boolean {
  if (!targetTemplateId) return false;

  const sourceTemplateId = resolveCoachingEntrySourceTemplateId(
    entryWorkoutId,
    entrySourceTemplateId,
    workouts,
    templates,
  );

  return (
    normalizeId(sourceTemplateId) === normalizeId(targetTemplateId)
  );
}