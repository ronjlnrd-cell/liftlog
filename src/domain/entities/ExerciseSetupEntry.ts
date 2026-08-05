export interface ExerciseSetupEntry {
  id: string;
  userId: string;
  workoutId: string;
  workoutExerciseId: string;
  exerciseId: string;
  content: string;
  createdAt: string;
  sourceTemplateId?: string;
}
