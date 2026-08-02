import { getDb } from "../database/databaseManager";
import type { Exercise } from "../../domain/entities/Exercise";

export class ExerciseRepository {
  async getAll(): Promise<Exercise[]> {
    return getDb().exercises.orderBy("name").toArray();
  }

  async add(exercise: Exercise): Promise<void> {
    await getDb().exercises.put(exercise);
  }

  async archive(id: string): Promise<void> {
    await getDb().exercises.update(id, { archivedAt: new Date() });
  }
}

export const exerciseRepository = new ExerciseRepository();
