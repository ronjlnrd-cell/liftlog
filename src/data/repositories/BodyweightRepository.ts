import { getDb } from "../database/databaseManager";
import type { BodyweightEntry } from "../../domain/entities/BodyweightEntry";

export const bodyweightRepository = {
  async getAll(): Promise<BodyweightEntry[]> {
    return (await getDb().bodyweightEntries.toArray()).sort((a,b) => b.recordedAt.localeCompare(a.recordedAt));
  },
  async save(entry: BodyweightEntry) { await getDb().bodyweightEntries.put(entry); },
  async remove(id: string) { await getDb().bodyweightEntries.delete(id); },
};
