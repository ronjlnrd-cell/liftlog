import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Exercise } from "../entities/Exercise";
import { ExerciseSource } from "../types/exercise-source";
import { LoadType } from "../types/LoadType";
import { MovementPattern } from "../types/MovementPattern";
import { MuscleGroup } from "../types/MuscleGroup";
import { updateCustomExercise } from "./updateCustomExercise";

const addMock = vi.fn();

vi.mock("../../data/repositories/ExerciseRepository", () => ({
  exerciseRepository: {
    add: (...args: unknown[]) => addMock(...args),
  },
}));

const customExercise: Exercise = {
  id: "custom-1",
  name: "Tempo Bench",
  primaryMuscle: MuscleGroup.CHEST,
  movementPattern: MovementPattern.UNKNOWN,
  loadType: LoadType.UNKNOWN,
  defaultWeightIncrement: null,
  source: ExerciseSource.CUSTOM,
  archivedAt: null,
};

const builtInExercise: Exercise = {
  ...customExercise,
  id: "built-in-1",
  name: "Bench Press",
  source: ExerciseSource.BUILT_IN,
};

describe("updateCustomExercise", () => {
  beforeEach(() => {
    addMock.mockReset();
    addMock.mockResolvedValue(undefined);
  });

  it("updates name, primary muscle, and equipment for a custom exercise", async () => {
    const result = await updateCustomExercise(
      {
        id: customExercise.id,
        name: "Paused Bench",
        primaryMuscle: MuscleGroup.TRICEPS,
        loadType: LoadType.CABLE,
      },
      [customExercise],
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.exercise.name).toBe("Paused Bench");
    expect(result.exercise.primaryMuscle).toBe(MuscleGroup.TRICEPS);
    expect(result.exercise.loadType).toBe(LoadType.CABLE);
    expect(result.exercise.id).toBe(customExercise.id);
    expect(addMock).toHaveBeenCalledWith(result.exercise);
  });

  it("rejects empty names", async () => {
    const result = await updateCustomExercise(
      {
        id: customExercise.id,
        name: "   ",
        primaryMuscle: MuscleGroup.CHEST,
        loadType: LoadType.UNKNOWN,
      },
      [customExercise],
    );

    expect(result).toEqual({ ok: false, error: "Exercise name is required." });
    expect(addMock).not.toHaveBeenCalled();
  });

  it("rejects duplicate names among active exercises", async () => {
    const otherCustom: Exercise = {
      ...customExercise,
      id: "custom-2",
      name: "Paused Bench",
    };

    const result = await updateCustomExercise(
      {
        id: customExercise.id,
        name: "Paused Bench",
        primaryMuscle: MuscleGroup.CHEST,
        loadType: LoadType.UNKNOWN,
      },
      [customExercise, otherCustom],
    );

    expect(result).toEqual({
      ok: false,
      error: "An exercise with this name already exists.",
    });
    expect(addMock).not.toHaveBeenCalled();
  });

  it("allows keeping the same name for the same exercise", async () => {
    const result = await updateCustomExercise(
      {
        id: customExercise.id,
        name: "Tempo Bench",
        primaryMuscle: MuscleGroup.BACK,
        loadType: LoadType.UNKNOWN,
      },
      [customExercise],
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.exercise.primaryMuscle).toBe(MuscleGroup.BACK);
    expect(addMock).toHaveBeenCalledWith(result.exercise);
  });

  it("rejects editing built-in exercises", async () => {
    const result = await updateCustomExercise(
      {
        id: builtInExercise.id,
        name: "Renamed Bench",
        primaryMuscle: MuscleGroup.CHEST,
        loadType: LoadType.UNKNOWN,
      },
      [builtInExercise],
    );

    expect(result).toEqual({
      ok: false,
      error: "Only custom exercises can be edited.",
    });
    expect(addMock).not.toHaveBeenCalled();
  });
});
