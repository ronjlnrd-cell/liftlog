import type { Exercise } from "../entities/Exercise";
import type { Workout } from "../entities/workout";

export type WorkoutAchievement = {
  key: string;
  icon: string;
  title: string;
  detail: string;
};

function workoutMilestones(total: number): number[] {
  return [1, 10, 25, 50, 100, 250, 500].filter((value) => total === value);
}

function weightMilestone(weight: number): number | null {
  const milestones = [40, 60, 80, 100, 120, 140, 160, 180, 200, 225, 250, 300];
  return [...milestones].reverse().find((value) => weight >= value) ?? null;
}

export function getWorkoutAchievements(
  workout: Workout,
  workouts: Workout[],
  exercises: Exercise[],
  unit: "KG" | "LB",
): WorkoutAchievement[] {
  const achievements: WorkoutAchievement[] = [];
  const completedCount = workouts.filter((item) => item.completedAt).length;

  for (const milestone of workoutMilestones(completedCount)) {
    achievements.push({
      key: `workouts-${milestone}`,
      icon: milestone === 1 ? "🎉" : "🔥",
      title: `${milestone} workout${milestone === 1 ? "" : "s"} completed`,
      detail:
        milestone === 1
          ? "Your first completed workout."
          : "A training consistency milestone.",
    });
  }

  for (const item of workout.exercises) {
    const exercise = exercises.find((candidate) => candidate.id === item.exerciseId);
    if (!exercise || item.completedSets.length === 0) continue;

    const maxWeight = Math.max(...item.completedSets.map((set) => set.weight));
    const milestone = weightMilestone(maxWeight);
    if (!milestone) continue;

    const earlierMax = Math.max(
      0,
      ...workouts
        .filter((candidate) => candidate.id !== workout.id)
        .flatMap((candidate) =>
          candidate.exercises
            .filter(
              (candidateExercise) =>
                candidateExercise.exerciseId === item.exerciseId,
            )
            .flatMap((candidateExercise) =>
              candidateExercise.completedSets.map((set) => set.weight),
            ),
        ),
    );

    if (earlierMax < milestone) {
      achievements.push({
        key: `weight-${item.exerciseId}-${milestone}`,
        icon: "💪",
        title: `${milestone} ${unit.toLowerCase()} ${exercise.name}`,
        detail: `First logged set at or above ${milestone} ${unit.toLowerCase()}.`,
      });
    }
  }

  return achievements;
}

export function formatWorkoutDuration(
  startedAt: Date,
  completedAt: Date | null,
): string {
  if (!completedAt) return "—";

  const totalMinutes = Math.max(
    0,
    Math.round(
      (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60_000,
    ),
  );

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
