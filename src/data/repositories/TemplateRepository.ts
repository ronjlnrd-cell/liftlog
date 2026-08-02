import { getDb } from "../database/databaseManager";
import type { WorkoutTemplate } from "../../domain/entities/Template";

export class TemplateRepository {
  async getAll(): Promise<WorkoutTemplate[]> {
    return getDb().templates.orderBy("createdAt").reverse().toArray();
  }

  async save(template: WorkoutTemplate): Promise<void> {
    await getDb().templates.put(template);
  }

  async remove(id: string): Promise<void> {
    await getDb().templates.delete(id);
  }
}

export const templateRepository = new TemplateRepository();
