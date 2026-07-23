import { db } from "../database/db";
import type { WorkoutTemplate } from "../../domain/entities/Template";

export class TemplateRepository {
  async getAll(): Promise<WorkoutTemplate[]> {
    return db.templates.orderBy("createdAt").reverse().toArray();
  }

  async save(template: WorkoutTemplate): Promise<void> {
    await db.templates.put(template);
  }

  async remove(id: string): Promise<void> {
    await db.templates.delete(id);
  }
}

export const templateRepository = new TemplateRepository();
