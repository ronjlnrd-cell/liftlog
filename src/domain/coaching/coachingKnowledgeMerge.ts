import type { WorkoutTemplate } from "../entities/Template";
type CoachingKnowledgeEntry = {
  id: string;
  workoutId: string;
  sourceTemplateId?: string;
  createdAt: string;
};

type PendingSync = {
  kind: string;
  id: string;
};

export function chooseCoachingKnowledgeEntry<T extends CoachingKnowledgeEntry>(
  local: T,
  cloud: T,
  pendingEntryIds: Set<string>,
): T {
  if (pendingEntryIds.has(local.id)) {
    return local;
  }

  if (local.sourceTemplateId && !cloud.sourceTemplateId) {
    return local;
  }

  if (!local.sourceTemplateId && cloud.sourceTemplateId) {
    return cloud;
  }

  if (local.sourceTemplateId && local.sourceTemplateId !== cloud.sourceTemplateId) {
    return local;
  }

  if (local.workoutId !== cloud.workoutId) {
    if (cloud.workoutId === "active" && local.workoutId !== "active") {
      return local;
    }
  }

  return new Date(local.createdAt).getTime() >= new Date(cloud.createdAt).getTime()
    ? local
    : cloud;
}

export function mergeCoachingKnowledgeEntries<T extends CoachingKnowledgeEntry>(
  localEntries: T[],
  cloudEntries: T[],
  pendingEntryIds: Set<string>,
): T[] {
  const merged = new Map(cloudEntries.map((entry) => [entry.id, entry]));

  for (const local of localEntries) {
    const cloud = merged.get(local.id);
    merged.set(
      local.id,
      cloud ? chooseCoachingKnowledgeEntry(local, cloud, pendingEntryIds) : local,
    );
  }

  return Array.from(merged.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function chooseTemplate(
  local: WorkoutTemplate,
  cloud: WorkoutTemplate,
  pending: PendingSync[],
): WorkoutTemplate {
  if (pending.some((item) => item.kind === "template" && item.id === local.id)) {
    return local;
  }

  if (local.originWorkoutId && !cloud.originWorkoutId) {
    return { ...cloud, ...local };
  }

  return new Date(local.createdAt).getTime() >= new Date(cloud.createdAt).getTime()
    ? { ...cloud, ...local }
    : { ...local, ...cloud };
}

export function mergeTemplates(
  localTemplates: WorkoutTemplate[],
  cloudTemplates: WorkoutTemplate[],
  pending: PendingSync[],
): WorkoutTemplate[] {
  const merged = new Map(cloudTemplates.map((template) => [template.id, template]));

  for (const local of localTemplates) {
    const cloud = merged.get(local.id);
    merged.set(
      local.id,
      cloud ? chooseTemplate(local, cloud, pending) : local,
    );
  }

  return Array.from(merged.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}