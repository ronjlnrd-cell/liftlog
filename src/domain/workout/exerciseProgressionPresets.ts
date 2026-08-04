import type { WorkoutExercise } from "../entities/workout";

export type ExerciseProgressionPreset = {
  nextWeight: number;
  reps: number;
  sets: number;
  restSeconds: number;
};

function storageKey(userId: string) {
  return `liftlog-exercise-progressions:${userId}`;
}

function readAll(userId: string): Record<string, ExerciseProgressionPreset> {
  try {
    return JSON.parse(
      localStorage.getItem(storageKey(userId)) ?? "{}",
    ) as Record<string, ExerciseProgressionPreset>;
  } catch {
    return {};
  }
}

export function readExerciseProgressionPreset(
  userId: string,
  exerciseId: string,
): ExerciseProgressionPreset | null {
  return readAll(userId)[exerciseId] ?? null;
}

export function saveExerciseProgressionPreset(
  userId: string,
  exerciseId: string,
  preset: ExerciseProgressionPreset,
) {
  const all = readAll(userId);
  all[exerciseId] = preset;
  localStorage.setItem(storageKey(userId), JSON.stringify(all));
}

export function clearExerciseProgressionPreset(
  userId: string,
  exerciseId: string,
) {
  const all = readAll(userId);
  if (!(exerciseId in all)) return;
  delete all[exerciseId];
  localStorage.setItem(storageKey(userId), JSON.stringify(all));
}

export function createWorkoutExerciseFromPreset(
  exerciseId: string,
  order: number,
  preset: ExerciseProgressionPreset,
): WorkoutExercise {
  return {
    id: crypto.randomUUID(),
    exerciseId,
    order,
    plannedRestSeconds: preset.restSeconds,
    plannedSets: Array.from({ length: preset.sets }, (_, index) => ({
      order: index,
      weight: preset.nextWeight,
      reps: preset.reps,
    })),
    completedSets: [],
  };
}
