import type { BodyweightEntry } from "../../domain/entities/BodyweightEntry";
import type { PeriodEntry } from "../../domain/entities/PeriodEntry";
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

export type CloudWorkout = {
  workout: Workout;
  updatedAt: string;
};

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
    gender: row.gender,
    weightUnit: row.weight_unit,
    userId,
    setupCompleted: true,
    cycleTrackingEnabled: Boolean(row.cycle_tracking_enabled),
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
  const { error } = await client().from("profiles").upsert({
    user_id: userId,
    gender: profile.gender,
    weight_unit: profile.weightUnit,
    cycle_tracking_enabled: profile.cycleTrackingEnabled ?? false,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
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
  const { data, error } = await client()
    .from("workouts")
    .delete()
    .eq("user_id", userId)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(`Workout ${id} was not deleted from Supabase.`);
  }
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
  const { data, error } = await client()
    .from("templates")
    .delete()
    .eq("user_id", userId)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(`Template ${id} was not deleted from Supabase.`);
  }
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
  const { data, error } = await client()
    .from("bodyweight_entries")
    .delete()
    .eq("user_id", userId)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(`Bodyweight ${id} was not deleted from Supabase.`);
  }
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
  const { data, error } = await client()
    .from("period_entries")
    .delete()
    .eq("user_id", userId)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(`Period entry ${id} was not deleted from Supabase.`);
  }
}
