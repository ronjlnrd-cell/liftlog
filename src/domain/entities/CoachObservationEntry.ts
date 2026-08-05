export interface CoachObservationEntry {
  id: string;
  userId: string;
  workoutId: string;
  workoutExerciseId: string;
  exerciseId: string;
  setOrder: number;
  content: string;
  createdAt: string;
  sourceTemplateId?: string;
}
