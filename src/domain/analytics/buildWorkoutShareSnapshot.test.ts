import { describe, expect, it } from "vitest";
import type { Exercise } from "../entities/Exercise";
import type { Workout } from "../entities/workout";
import { ExerciseSource } from "../types/exercise-source";
import { LoadType } from "../types/LoadType";
import { MovementPattern } from "../types/MovementPattern";
import { MuscleGroup } from "../types/MuscleGroup";
import { buildWorkoutShareSnapshot } from "./buildWorkoutShareSnapshot";

const benchPress: Exercise = {
  id: "bench-1",
  name: "Bench Press",
  primaryMuscle: MuscleGroup.CHEST,
  movementPattern: MovementPattern.UNKNOWN,
  loadType: LoadType.BARBELL,
  defaultWeightIncrement: null,
  source: ExerciseSource.BUILT_IN,
  archivedAt: null,
};

function completedWorkout(): Workout {
  const startedAt = new Date("2026-08-06T08:30:00");
  const completedAt = new Date("2026-08-06T09:15:00");

  return {
    id: "workout-1",
    startedAt,
    completedAt,
    bodyweight: null,
    exercises: [
      {
        id: "item-1",
        exerciseId: benchPress.id,
        order: 0,
        plannedRestSeconds: 90,
        plannedSets: [],
        completedSets: [
          { order: 0, weight: 80, reps: 5 },
          { order: 1, weight: 75, reps: 8 },
        ],
      },
    ],
  };
}

describe("buildWorkoutShareSnapshot", () => {
  it("puts achievements first and marks PR sets with a trophy", () => {
    const workout = completedWorkout();
    const snapshot = buildWorkoutShareSnapshot({
      workout,
      workouts: [workout],
      exercises: [benchPress],
      unit: "KG",
      appName: "Stronger!",
    });

    expect(snapshot.startsWith("Stronger! Workout")).toBe(true);
    expect(snapshot).toContain("🎉 1 workout completed");
    expect(snapshot).toContain("Bench Press");
    expect(snapshot).toContain("🏆 80 kg × 5");
    expect(snapshot).toContain("75 kg × 8");
    expect(snapshot).not.toContain("rest");
    expect(snapshot).not.toContain("note");
  });
});
