export type CoachingKnowledgePreferences = {
  coachingKnowledgeVisible: boolean;
};

const defaultPreferences: CoachingKnowledgePreferences = {
  coachingKnowledgeVisible: false,
};

function storageKey(userId: string) {
  return `liftlog-coaching-knowledge-prefs:${userId}`;
}

export function readCoachingKnowledgePreferences(
  userId: string,
): CoachingKnowledgePreferences {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { ...defaultPreferences };

    const parsed = JSON.parse(raw) as Partial<
      CoachingKnowledgePreferences & { workoutContextVisible?: boolean }
    >;
    return {
      coachingKnowledgeVisible:
        parsed.coachingKnowledgeVisible ??
        parsed.workoutContextVisible ??
        false,
    };
  } catch {
    return { ...defaultPreferences };
  }
}

export function saveCoachingKnowledgePreferences(
  userId: string,
  preferences: CoachingKnowledgePreferences,
) {
  localStorage.setItem(storageKey(userId), JSON.stringify(preferences));
}
