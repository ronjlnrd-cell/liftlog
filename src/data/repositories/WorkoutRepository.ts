import { db } from "../database/db";
import type { Workout } from "../../domain/entities/workout";

export class WorkoutRepository {
  async getAll(): Promise<Workout[]> {
    return db.workouts.orderBy("startedAt").reverse().toArray();
  }

  async save(workout: Workout): Promise<void> {
    await db.workouts.put(workout);
  }

  async remove(id: string): Promise<void> {
    await db.workouts.delete(id);
  }

  async getActive(): Promise<Workout | undefined> {
    return db.activeWorkout.get("active");
  }

  async saveActive(workout: Workout): Promise<void> {
    await db.activeWorkout.put({ ...workout, id: "active" });
  }

  async clearActive(): Promise<void> {
    await db.activeWorkout.delete("active");
  }
}

export const workoutRepository = new WorkoutRepository();
