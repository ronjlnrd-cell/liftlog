import type { Exercise } from "../entities/Exercise";
import type { Workout } from "../entities/workout";
import { getWorkoutPRs, setKey } from "./personalRecords";
import {
  formatWorkoutDuration,
  getWorkoutAchievements,
  type WorkoutAchievement,
} from "./workoutAchievements";

export type WorkoutShareSnapshotSet = {
  weight: number;
  reps: number;
  isPR: boolean;
};

export type WorkoutShareSnapshotExercise = {
  name: string;
  sets: WorkoutShareSnapshotSet[];
};

export type WorkoutShareSnapshotData = {
  appName: string;
  achievements: WorkoutAchievement[];
  timestamp: string;
  durationLabel: string;
  totalSets: number;
  volumeLabel: string;
  summary: string;
  exercises: WorkoutShareSnapshotExercise[];
};

export type GetWorkoutShareSnapshotDataInput = {
  workout: Workout;
  workouts: Workout[];
  exercises: Exercise[];
  unit: "KG" | "LB";
  appName?: string;
};

function formatWorkoutTimestamp(value: Date | string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getWorkoutShareSnapshotData(
  input: GetWorkoutShareSnapshotDataInput,
): WorkoutShareSnapshotData {
  const { workout, workouts, exercises, unit } = input;
  const appName = input.appName ?? "Stronger!";
  const unitLabel = unit.toLowerCase();
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const allPRs = getWorkoutPRs(workouts);
  const achievements = getWorkoutAchievements(workout, workouts, exercises, unit);

  const totalSets = workout.exercises.reduce(
    (sum, item) => sum + item.completedSets.length,
    0,
  );
  const volume = workout.exercises.reduce(
    (workoutTotal, item) =>
      workoutTotal +
      item.completedSets.reduce(
        (exerciseTotal, set) => exerciseTotal + set.weight * set.reps,
        0,
      ),
    0,
  );

  const snapshotExercises: WorkoutShareSnapshotExercise[] = [];

  for (const item of [...workout.exercises].sort((a, b) => a.order - b.order)) {
    if (item.completedSets.length === 0) continue;

    const exercise = exerciseById.get(item.exerciseId);
    snapshotExercises.push({
      name: exercise?.name ?? "Exercise",
      sets: [...item.completedSets]
        .sort((a, b) => a.order - b.order)
        .map((set) => ({
          weight: set.weight,
          reps: set.reps,
          isPR: allPRs.has(setKey(workout.id, item.id, set.order)),
        })),
    });
  }

  return {
    appName,
    achievements,
    timestamp: formatWorkoutTimestamp(workout.startedAt),
    durationLabel: formatWorkoutDuration(workout.startedAt, workout.completedAt),
    totalSets,
    volumeLabel: `${Math.round(volume).toLocaleString()} ${unitLabel}`,
    summary: `${formatWorkoutDuration(workout.startedAt, workout.completedAt)} · ${totalSets} sets · ${Math.round(volume).toLocaleString()} ${unitLabel}`,
    exercises: snapshotExercises,
  };
}
