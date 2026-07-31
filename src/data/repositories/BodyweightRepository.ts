import { db } from "../database/db";
import type { BodyweightEntry } from "../../domain/entities/BodyweightEntry";

export const bodyweightRepository = {
  async getAll(): Promise<BodyweightEntry[]> {
    return (await db.bodyweightEntries.toArray()).sort((a,b) => b.recordedAt.localeCompare(a.recordedAt));
  },
  async save(entry: BodyweightEntry) { await db.bodyweightEntries.put(entry); },
  async remove(id: string) { await db.bodyweightEntries.delete(id); },
};
