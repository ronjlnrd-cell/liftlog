export interface WorkoutTemplate {
  id: string;
  name: string;
  createdAt: Date;
  /** Workout this template was created from, when saved via "Save as template". */
  originWorkoutId?: string;
  exercises: TemplateExercise[];
}

export interface TemplateExercise {
  exerciseId: string;
  order: number;
  plannedRestSeconds: number;
  plannedSets: TemplateSet[];
}

export interface TemplateSet {
  order: number;
  weight: number | null;
  reps: number | null;
}
