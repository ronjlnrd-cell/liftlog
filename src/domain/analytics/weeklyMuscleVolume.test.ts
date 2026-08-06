import { describe, expect, it } from "vitest";
import type { Exercise } from "../entities/Exercise";
import type { Workout } from "../entities/workout";
import { ExerciseSource } from "../types/exercise-source";
import { LoadType } from "../types/LoadType";
import { MovementPattern } from "../types/MovementPattern";
import { MuscleGroup } from "../types/MuscleGroup";
import { getWeeklyMuscleSetCounts, resolveTrackedMuscleGroup } from "./weeklyMuscleVolume";

const customExercise: Exercise = {
  id: "custom-1",
  name: "Tempo Bench",
  primaryMuscle: MuscleGroup.CHEST,
  movementPattern: MovementPattern.UNKNOWN,
  loadType: LoadType.BARBELL,
  defaultWeightIncrement: null,
  source: ExerciseSource.CUSTOM,
  archivedAt: null,
};

function workoutWithSets(exerciseId: string, setCount: number, completedAt: Date): Workout {
  return {
    id: "workout-1",
    startedAt: completedAt,
    completedAt,
    bodyweight: null,
    exercises: [
      {
        id: "item-1",
        exerciseId,
        order: 0,
        plannedRestSeconds: 90,
        plannedSets: [],
        completedSets: Array.from({ length: setCount }, (_, index) => ({
          weight: 60,
          reps: 8,
          order: index,
        })),
      },
    ],
  };
}

describe("weeklyMuscleVolume", () => {
  it("maps legacy Quads muscle group to quadriceps for tracking", () => {
    expect(resolveTrackedMuscleGroup(MuscleGroup.QUADS)).toBe(MuscleGroup.QUADRICEPS);
  });

  it("counts completed sets from custom exercises", () => {
    const completedAt = new Date();
    const counts = getWeeklyMuscleSetCounts(
      [customExercise],
      [workoutWithSets(customExercise.id, 3, completedAt)],
    );

    expect(counts.get(MuscleGroup.CHEST)).toBe(3);
  });

  it("includes completed sets from the active workout", () => {
    const activeWorkout: Workout = {
      ...workoutWithSets(customExercise.id, 2, new Date()),
      completedAt: null,
    };

    const counts = getWeeklyMuscleSetCounts([customExercise], [], {
      activeWorkout,
    });

    expect(counts.get(MuscleGroup.CHEST)).toBe(2);
  });
});
