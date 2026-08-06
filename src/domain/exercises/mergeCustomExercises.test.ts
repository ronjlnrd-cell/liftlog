import { describe, expect, it } from "vitest";
import type { Exercise } from "../entities/Exercise";
import { ExerciseSource } from "../types/exercise-source";
import { LoadType } from "../types/LoadType";
import { MovementPattern } from "../types/MovementPattern";
import { MuscleGroup } from "../types/MuscleGroup";
import {
  mergeCustomExercises,
  mergeExerciseCatalog,
} from "./mergeCustomExercises";

function customExercise(id: string, name: string): Exercise {
  return {
    id,
    name,
    primaryMuscle: MuscleGroup.UNKNOWN,
    movementPattern: MovementPattern.UNKNOWN,
    loadType: LoadType.UNKNOWN,
    defaultWeightIncrement: null,
    source: ExerciseSource.CUSTOM,
    archivedAt: null,
  };
}

function builtInExercise(id: string, name: string): Exercise {
  return {
    ...customExercise(id, name),
    source: ExerciseSource.BUILT_IN,
  };
}

describe("mergeCustomExercises", () => {
  it("keeps local customs that are missing from cloud", () => {
    const local = [customExercise("local-1", "My Press")];
    const cloud: Exercise[] = [];

    const merged = mergeCustomExercises(local, cloud);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe("local-1");
  });

  it("prefers local customs over cloud entries with the same id", () => {
    const local = [customExercise("shared-1", "Local Name")];
    const cloud = [customExercise("shared-1", "Cloud Name")];

    const merged = mergeCustomExercises(local, cloud);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.name).toBe("Local Name");
  });

  it("adds cloud-only customs", () => {
    const local = [customExercise("local-1", "Local Lift")];
    const cloud = [customExercise("cloud-1", "Cloud Lift")];

    const merged = mergeCustomExercises(local, cloud);

    expect(merged.map((exercise) => exercise.id).sort()).toEqual([
      "cloud-1",
      "local-1",
    ]);
  });
});

describe("mergeExerciseCatalog", () => {
  it("preserves built-ins and local customs after a cloud reload", () => {
    const local = [
      builtInExercise("bench", "Bench Press"),
      customExercise("local-1", "My Custom"),
    ];
    const cloud: Exercise[] = [];

    const merged = mergeExerciseCatalog(local, cloud);

    expect(merged.map((exercise) => exercise.id).sort()).toEqual([
      "bench",
      "local-1",
    ]);
  });

  it("simulates retry after sync failure without dropping the local catalog", () => {
    const dexieCatalog = [
      builtInExercise("squat", "Squat"),
      customExercise("new-custom", "Tempo Squat"),
    ];
    const cloudCatalog: Exercise[] = [];

    const afterConnect = mergeExerciseCatalog(dexieCatalog, cloudCatalog);

    expect(afterConnect.some((exercise) => exercise.id === "new-custom")).toBe(
      true,
    );
    expect(afterConnect.some((exercise) => exercise.id === "squat")).toBe(true);
  });
});
