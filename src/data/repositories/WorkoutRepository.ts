import { getDb } from "../database/databaseManager";
import type { Workout } from "../../domain/entities/workout";

export class WorkoutRepository {
  async getAll(): Promise<Workout[]> {
    return getDb().workouts.orderBy("startedAt").reverse().toArray();
  }

  async save(workout: Workout): Promise<void> {
    await getDb().workouts.put(workout);
  }

  async remove(id: string): Promise<void> {
    await getDb().workouts.delete(id);
  }

  async getActive(): Promise<Workout | undefined> {
    return getDb().activeWorkout.get("active");
  }

  async saveActive(workout: Workout): Promise<void> {
    await getDb().activeWorkout.put({ ...workout, id: "active" });
  }

  async clearActive(): Promise<void> {
    await getDb().activeWorkout.delete("active");
  }
}

export const workoutRepository = new WorkoutRepository();
