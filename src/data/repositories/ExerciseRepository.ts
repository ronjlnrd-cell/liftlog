import { db } from "../database/db";
import type { Exercise } from "../../domain/entities/Exercise";

export class ExerciseRepository {
  async getAll(): Promise<Exercise[]> {
    return db.exercises.orderBy("name").toArray();
  }

  async add(exercise: Exercise): Promise<void> {
    await db.exercises.put(exercise);
  }

  async archive(id: string): Promise<void> {
    await db.exercises.update(id, { archivedAt: new Date() });
  }
}

export const exerciseRepository = new ExerciseRepository();
