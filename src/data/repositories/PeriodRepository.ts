import { getDb } from "../database/databaseManager";
import type { PeriodEntry } from "../../domain/entities/PeriodEntry";

export const periodRepository = {
  async getAll(): Promise<PeriodEntry[]> {
    return (await getDb().periodEntries.toArray()).sort((a, b) =>
      b.startDate.localeCompare(a.startDate),
    );
  },
  async save(entry: PeriodEntry) {
    await getDb().periodEntries.put(entry);
  },
  async remove(id: string) {
    await getDb().periodEntries.delete(id);
  },
};
