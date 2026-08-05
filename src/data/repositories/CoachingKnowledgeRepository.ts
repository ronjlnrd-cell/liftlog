import { getDb } from "../database/databaseManager";
import type { CoachObservationEntry } from "../../domain/entities/CoachObservationEntry";
import type { ExerciseSetupEntry } from "../../domain/entities/ExerciseSetupEntry";
import type { WorkoutContextEntry } from "../../domain/entities/WorkoutContextEntry";
import type { WorkoutTemplate } from "../../domain/entities/Template";
import type { Workout } from "../../domain/entities/workout";
import { resolveWorkoutSourceTemplateId } from "../../domain/coaching/coachingTemplateContext";

export const coachingKnowledgeRepository = {
  async getWorkoutContexts(): Promise<WorkoutContextEntry[]> {
    return (await getDb().workoutContextEntries.toArray()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  async saveWorkoutContext(entry: WorkoutContextEntry) {
    await getDb().workoutContextEntries.put(entry);
  },

  async getExerciseSetups(): Promise<ExerciseSetupEntry[]> {
    return (await getDb().exerciseSetupEntries.toArray()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  async saveExerciseSetup(entry: ExerciseSetupEntry) {
    await getDb().exerciseSetupEntries.put(entry);
  },

  async getCoachObservations(): Promise<CoachObservationEntry[]> {
    return (await getDb().coachObservationEntries.toArray()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  async saveCoachObservation(entry: CoachObservationEntry) {
    await getDb().coachObservationEntries.put(entry);
  },

  async reassignWorkoutId(fromWorkoutId: string, toWorkoutId: string) {
    const db = getDb();
    const contexts = await db.workoutContextEntries
      .where("workoutId")
      .equals(fromWorkoutId)
      .toArray();
    const setups = await db.exerciseSetupEntries
      .where("workoutId")
      .equals(fromWorkoutId)
      .toArray();
    const observations = await db.coachObservationEntries
      .where("workoutId")
      .equals(fromWorkoutId)
      .toArray();

    await Promise.all([
      ...contexts.map((entry) =>
        db.workoutContextEntries.put({ ...entry, workoutId: toWorkoutId }),
      ),
      ...setups.map((entry) =>
        db.exerciseSetupEntries.put({ ...entry, workoutId: toWorkoutId }),
      ),
      ...observations.map((entry) =>
        db.coachObservationEntries.put({ ...entry, workoutId: toWorkoutId }),
      ),
    ]);

    return {
      contexts: contexts.map((entry) => ({ ...entry, workoutId: toWorkoutId })),
      setups: setups.map((entry) => ({ ...entry, workoutId: toWorkoutId })),
      observations: observations.map((entry) => ({
        ...entry,
        workoutId: toWorkoutId,
      })),
    };
  },

  async linkEntriesToTemplate(workoutId: string, sourceTemplateId: string) {
    const db = getDb();
    const activeWorkout = await db.activeWorkout.get("active");

    const linkedContexts: WorkoutContextEntry[] = [];
    for (const entry of await db.workoutContextEntries.toArray()) {
      const matchesWorkout = entry.workoutId === workoutId;
      const staleActive =
        entry.workoutId === "active" && activeWorkout == null;
      if (!matchesWorkout && !staleActive) continue;

      const updated: WorkoutContextEntry = {
        ...entry,
        workoutId,
        sourceTemplateId,
      };
      await db.workoutContextEntries.put(updated);
      linkedContexts.push(updated);
    }

    const linkedSetups: ExerciseSetupEntry[] = [];
    for (const entry of await db.exerciseSetupEntries.toArray()) {
      const matchesWorkout = entry.workoutId === workoutId;
      const staleActive =
        entry.workoutId === "active" && activeWorkout == null;
      if (!matchesWorkout && !staleActive) continue;

      const updated: ExerciseSetupEntry = {
        ...entry,
        workoutId,
        sourceTemplateId,
      };
      await db.exerciseSetupEntries.put(updated);
      linkedSetups.push(updated);
    }

    const linkedObservations: CoachObservationEntry[] = [];
    for (const entry of await db.coachObservationEntries.toArray()) {
      const matchesWorkout = entry.workoutId === workoutId;
      const staleActive =
        entry.workoutId === "active" && activeWorkout == null;
      if (!matchesWorkout && !staleActive) continue;

      const updated: CoachObservationEntry = {
        ...entry,
        workoutId,
        sourceTemplateId,
      };
      await db.coachObservationEntries.put(updated);
      linkedObservations.push(updated);
    }

    return {
      contexts: linkedContexts,
      setups: linkedSetups,
      observations: linkedObservations,
    };
  },

  async enrichTemplateLinks(workouts: Workout[], templates: WorkoutTemplate[]) {
    const db = getDb();
    const workoutById = new Map(workouts.map((workout) => [workout.id, workout]));
    const [contexts, setups, observations] = await Promise.all([
      db.workoutContextEntries.toArray(),
      db.exerciseSetupEntries.toArray(),
      db.coachObservationEntries.toArray(),
    ]);

    const updates: Promise<unknown>[] = [];

    for (const entry of contexts) {
      if (entry.sourceTemplateId) continue;
      const sourceTemplateId = resolveWorkoutSourceTemplateId(
        workoutById.get(entry.workoutId),
        entry.workoutId,
        templates,
      );
      if (!sourceTemplateId) continue;
      updates.push(
        db.workoutContextEntries.put({ ...entry, sourceTemplateId }),
      );
    }

    for (const entry of setups) {
      if (entry.sourceTemplateId) continue;
      const sourceTemplateId = resolveWorkoutSourceTemplateId(
        workoutById.get(entry.workoutId),
        entry.workoutId,
        templates,
      );
      if (!sourceTemplateId) continue;
      updates.push(
        db.exerciseSetupEntries.put({ ...entry, sourceTemplateId }),
      );
    }

    for (const entry of observations) {
      if (entry.sourceTemplateId) continue;
      const sourceTemplateId = resolveWorkoutSourceTemplateId(
        workoutById.get(entry.workoutId),
        entry.workoutId,
        templates,
      );
      if (!sourceTemplateId) continue;
      updates.push(
        db.coachObservationEntries.put({ ...entry, sourceTemplateId }),
      );
    }

    if (updates.length > 0) {
      await Promise.all(updates);
    }
  },

  async removeByWorkoutId(workoutId: string) {
    const db = getDb();
    await Promise.all([
      db.workoutContextEntries.where("workoutId").equals(workoutId).delete(),
      db.exerciseSetupEntries.where("workoutId").equals(workoutId).delete(),
      db.coachObservationEntries.where("workoutId").equals(workoutId).delete(),
    ]);
  },
};
