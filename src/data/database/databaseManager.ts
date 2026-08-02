import { LiftLogDatabase } from "./liftLogDatabase";

let activeDb: LiftLogDatabase | null = null;
let activeUserId: string | null = null;

function databaseNameForUser(userId: string): string {
  return `LiftLogDatabase-${userId}`;
}

export async function openUserDatabase(userId: string): Promise<void> {
  if (activeUserId === userId && activeDb?.isOpen()) {
    return;
  }

  await closeUserDatabase();

  activeDb = new LiftLogDatabase(databaseNameForUser(userId));
  activeUserId = userId;
  await activeDb.open();
}

export async function closeUserDatabase(): Promise<void> {
  if (!activeDb) return;

  const closing = activeDb;
  activeDb = null;
  activeUserId = null;
  await closing.close();
}

export function getDb(): LiftLogDatabase {
  if (!activeDb) {
    throw new Error("No database is open. Call openUserDatabase() first.");
  }
  return activeDb;
}
