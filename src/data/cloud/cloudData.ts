import type { BodyweightEntry } from "../../domain/entities/BodyweightEntry";
import type { PeriodEntry } from "../../domain/entities/PeriodEntry";
import type { WorkoutContextEntry } from "../../domain/entities/WorkoutContextEntry";
import type { ExerciseSetupEntry } from "../../domain/entities/ExerciseSetupEntry";
import type { CoachObservationEntry } from "../../domain/entities/CoachObservationEntry";
import { supabase } from "../../lib/supabase";
import type { Profile } from "../../domain/entities/Profile";
import type { Workout } from "../../domain/entities/workout";
import type { WorkoutTemplate } from "../../domain/entities/Template";
import type { Exercise } from "../../domain/entities/Exercise";
import { ExerciseSource } from "../../domain/types/exercise-source";

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function isSchemaColumnError(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    message.includes("could not find") ||
    message.includes("column") && message.includes("does not exist")
  );
}

export type CloudWorkout = {
  workout: Workout;
  updatedAt: string;
};

function normalizeGender(value: string | null | undefined): Profile["gender"] {
  const upper = value?.toUpperCase();
  if (
    upper === "MALE" ||
    upper === "FEMALE" ||
    upper === "OTHER" ||
    upper === "UNSPECIFIED"
  ) {
    return upper;
  }
  return "UNSPECIFIED";
}

export async function loadCloudData(userId: string) {
  const db = client();
  const [profiles, workouts, templates, customExercises] = await Promise.all([
    db.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    db
      .from("workouts")
      .select("data, updated_at")
      .eq("user_id", userId)
      .order("started_at", { ascending: false }),
    db.from("templates").select("data").eq("user_id", userId).order("created_at", { ascending: false }),
    db.from("custom_exercises").select("data").eq("user_id", userId),
  ]);
  const error = profiles.error || workouts.error || templates.error || customExercises.error;
  if (error) throw error;
  const row = profiles.data;
  const profile: Profile | null = row ? {
    id: "profile",
    gender: normalizeGender(row.gender),
    weightUnit: row.weight_unit,
    userId,
    setupCompleted: true,
    cycleTrackingEnabled: Boolean(row.cycle_tracking_enabled),
    cycleTrackingConsentCompleted: Boolean(row.cycle_tracking_consent_completed),
  } : null;
  return {
    profile,
    workouts: (workouts.data ?? []).map((row) => ({
      workout: row.data as Workout,
      updatedAt: row.updated_at as string,
    })),
    templates: (templates.data ?? []).map((row) => row.data as WorkoutTemplate),
    customExercises: (customExercises.data ?? []).map((row) => row.data as Exercise),
  };
}

export async function saveCloudProfile(userId: string, profile: Profile) {
  const attempts: Record<string, unknown>[] = [
    {
      user_id: userId,
      gender: profile.gender,
      weight_unit: profile.weightUnit,
      cycle_tracking_enabled: profile.cycleTrackingEnabled ?? false,
      cycle_tracking_consent_completed:
        profile.cycleTrackingConsentCompleted ?? false,
      updated_at: new Date().toISOString(),
    },
    {
      user_id: userId,
      gender: profile.gender,
      weight_unit: profile.weightUnit,
      cycle_tracking_enabled: profile.cycleTrackingEnabled ?? false,
      updated_at: new Date().toISOString(),
    },
    {
      user_id: userId,
      gender: profile.gender,
      weight_unit: profile.weightUnit,
      updated_at: new Date().toISOString(),
    },
  ];

  let lastError: { code?: string; message?: string } | null = null;
  for (const payload of attempts) {
    const { error } = await client().from("profiles").upsert(payload);
    if (!error) return;
    if (!isSchemaColumnError(error) && !isMissingTableError(error)) throw error;
    lastError = error;
  }

  if (lastError) throw lastError;
}
export async function saveCloudWorkout(userId: string, workout: Workout) {
  const { error } = await client().from("workouts").upsert({
    id: workout.id, user_id: userId, data: workout,
    started_at: workout.startedAt, completed_at: workout.completedAt,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
export async function deleteCloudWorkout(userId: string, id: string) {
  const { error } = await client()
    .from("workouts")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}
export async function saveCloudTemplate(userId: string, template: WorkoutTemplate) {
  const { error } = await client().from("templates").upsert({
    id: template.id, user_id: userId, data: template,
    created_at: template.createdAt, updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
export async function saveCloudCustomExercise(userId: string, exercise: Exercise) {
  if (exercise.source === ExerciseSource.BUILT_IN) return;
  const { error } = await client().from("custom_exercises").upsert({
    id: exercise.id, user_id: userId, data: exercise, updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function deleteCloudTemplate(userId: string, id: string) {
  const { error } = await client()
    .from("templates")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}

export async function loadCloudBodyweights(userId: string): Promise<BodyweightEntry[]> {
  const { data, error } = await client()
    .from("bodyweight_entries")
    .select("id,user_id,weight,recorded_at,created_at")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    weight: Number(row.weight),
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
  }));
}

export async function saveCloudBodyweight(userId: string, entry: BodyweightEntry) {
  const { error } = await client().from("bodyweight_entries").upsert({
    id: entry.id,
    user_id: userId,
    weight: entry.weight,
    recorded_at: entry.recordedAt,
    created_at: entry.createdAt,
  });
  if (error) throw error;
}

export async function deleteCloudBodyweight(userId: string, id: string) {
  const { error } = await client()
    .from("bodyweight_entries")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}

export async function loadCloudPeriodEntries(
  userId: string,
): Promise<PeriodEntry[]> {
  const { data, error } = await client()
    .from("period_entries")
    .select("id,user_id,start_date,created_at")
    .eq("user_id", userId)
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    startDate: row.start_date,
    createdAt: row.created_at,
  }));
}

export async function saveCloudPeriodEntry(
  userId: string,
  entry: PeriodEntry,
) {
  const { error } = await client().from("period_entries").upsert({
    id: entry.id,
    user_id: userId,
    start_date: entry.startDate,
    created_at: entry.createdAt,
  });
  if (error) throw error;
}

export async function deleteCloudPeriodEntry(userId: string, id: string) {
  const { error } = await client()
    .from("period_entries")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}

function isMissingTableError(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    (message.includes("does not exist") && message.includes("relation"))
  );
}

async function saveCoachingRow(
  table:
    | "workout_context_entries"
    | "exercise_setup_entries"
    | "coach_observation_entries",
  userId: string,
  entryId: string,
  payloads: Record<string, unknown>[],
) {
  const db = client();
  let lastError: { code?: string; message?: string } | null = null;

  for (const payload of payloads) {
    const { data: updated, error: updateError } = await db
      .from(table)
      .update(payload)
      .eq("user_id", userId)
      .eq("id", entryId)
      .select("id");

    if (!updateError && updated && updated.length > 0) {
      return;
    }

    if (
      updateError &&
      !isSchemaColumnError(updateError) &&
      !isMissingTableError(updateError)
    ) {
      lastError = updateError;
    }
  }

  for (const payload of payloads) {
    const { error: insertError } = await db
      .from(table)
      .insert({ id: entryId, ...payload });

    if (!insertError) {
      return;
    }

    if (insertError.code === "23505") {
      for (const updatePayload of payloads) {
        const { error: updateError } = await db
          .from(table)
          .update(updatePayload)
          .eq("user_id", userId)
          .eq("id", entryId);
        if (!updateError) return;
        if (!isSchemaColumnError(updateError) && !isMissingTableError(updateError)) {
          lastError = updateError;
        }
      }
      continue;
    }

    if (!isSchemaColumnError(insertError) && !isMissingTableError(insertError)) {
      throw insertError;
    }
    lastError = insertError;
  }

  if (lastError) throw lastError;
}

export async function loadCloudWorkoutContexts(
  userId: string,
): Promise<WorkoutContextEntry[]> {
  const attempts = [
    "id,user_id,workout_id,content,created_at,source_template_id",
    "id,user_id,workout_id,content,created_at",
  ];

  let lastError: { code?: string; message?: string } | null = null;
  for (const columns of attempts) {
    const { data, error } = await client()
      .from("workout_context_entries")
      .select(columns)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error) {
      return (data ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        workoutId: row.workout_id,
        content: row.content,
        createdAt: row.created_at,
        sourceTemplateId: row.source_template_id ?? undefined,
      }));
    }
    if (!isSchemaColumnError(error) && !isMissingTableError(error)) throw error;
    lastError = error;
  }

  if (lastError) throw lastError;
  return [];
}

export async function saveCloudWorkoutContext(
  userId: string,
  entry: WorkoutContextEntry,
) {
  await saveCoachingRow("workout_context_entries", userId, entry.id, [
    {
      user_id: userId,
      workout_id: entry.workoutId,
      content: entry.content,
      created_at: entry.createdAt,
      source_template_id: entry.sourceTemplateId ?? null,
    },
    {
      user_id: userId,
      workout_id: entry.workoutId,
      content: entry.content,
      created_at: entry.createdAt,
    },
  ]);
}

export async function loadCloudExerciseSetups(
  userId: string,
): Promise<ExerciseSetupEntry[]> {
  const attempts = [
    "id,user_id,workout_id,workout_exercise_id,exercise_id,content,created_at,source_template_id",
    "id,user_id,workout_id,workout_exercise_id,exercise_id,content,created_at",
  ];

  let lastError: { code?: string; message?: string } | null = null;
  for (const columns of attempts) {
    const { data, error } = await client()
      .from("exercise_setup_entries")
      .select(columns)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error) {
      return (data ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        workoutId: row.workout_id,
        workoutExerciseId: row.workout_exercise_id,
        exerciseId: row.exercise_id,
        content: row.content,
        createdAt: row.created_at,
        sourceTemplateId: row.source_template_id ?? undefined,
      }));
    }
    if (!isSchemaColumnError(error) && !isMissingTableError(error)) throw error;
    lastError = error;
  }

  if (lastError) throw lastError;
  return [];
}

export async function saveCloudExerciseSetup(
  userId: string,
  entry: ExerciseSetupEntry,
) {
  await saveCoachingRow("exercise_setup_entries", userId, entry.id, [
    {
      user_id: userId,
      workout_id: entry.workoutId,
      workout_exercise_id: entry.workoutExerciseId,
      exercise_id: entry.exerciseId,
      content: entry.content,
      created_at: entry.createdAt,
      source_template_id: entry.sourceTemplateId ?? null,
    },
    {
      user_id: userId,
      workout_id: entry.workoutId,
      workout_exercise_id: entry.workoutExerciseId,
      exercise_id: entry.exerciseId,
      content: entry.content,
      created_at: entry.createdAt,
    },
  ]);
}

export async function loadCloudCoachObservations(
  userId: string,
): Promise<CoachObservationEntry[]> {
  const attempts = [
    "id,user_id,workout_id,workout_exercise_id,exercise_id,set_order,content,created_at,source_template_id",
    "id,user_id,workout_id,workout_exercise_id,exercise_id,set_order,content,created_at",
  ];

  let lastError: { code?: string; message?: string } | null = null;
  for (const columns of attempts) {
    const { data, error } = await client()
      .from("coach_observation_entries")
      .select(columns)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error) {
      return (data ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        workoutId: row.workout_id,
        workoutExerciseId: row.workout_exercise_id,
        exerciseId: row.exercise_id,
        setOrder: row.set_order,
        content: row.content,
        createdAt: row.created_at,
        sourceTemplateId: row.source_template_id ?? undefined,
      }));
    }
    if (!isSchemaColumnError(error) && !isMissingTableError(error)) throw error;
    lastError = error;
  }

  if (lastError) throw lastError;
  return [];
}

export async function saveCloudCoachObservation(
  userId: string,
  entry: CoachObservationEntry,
) {
  await saveCoachingRow("coach_observation_entries", userId, entry.id, [
    {
      user_id: userId,
      workout_id: entry.workoutId,
      workout_exercise_id: entry.workoutExerciseId,
      exercise_id: entry.exerciseId,
      set_order: entry.setOrder,
      content: entry.content,
      created_at: entry.createdAt,
      source_template_id: entry.sourceTemplateId ?? null,
    },
    {
      user_id: userId,
      workout_id: entry.workoutId,
      workout_exercise_id: entry.workoutExerciseId,
      exercise_id: entry.exerciseId,
      set_order: entry.setOrder,
      content: entry.content,
      created_at: entry.createdAt,
    },
  ]);
}
