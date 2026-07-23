export interface Workout {
  id: string;

  startedAt: Date;

  completedAt: Date | null;

  bodyweight: number | null;

  exercises: WorkoutExercise[];
}

export interface WorkoutExercise {
  exerciseId: string;

  order: number;

  plannedRestSeconds: number;

  plannedSets: PlannedSet[];

  completedSets: CompletedSet[];
}

export interface PlannedSet {
  order: number;

  weight: number | null;

  reps: number;

  completedAt?: Date;
}

export interface CompletedSet {
  order: number;

  weight: number;

  reps: number;
}