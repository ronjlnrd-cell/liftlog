export interface WorkoutContextEntry {
  id: string;
  userId: string;
  workoutId: string;
  content: string;
  createdAt: string;
  sourceTemplateId?: string;
}
