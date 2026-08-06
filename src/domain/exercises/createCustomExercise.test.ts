import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoadType } from "../types/LoadType";
import { MuscleGroup } from "../types/MuscleGroup";
import { createCustomExercise } from "./createCustomExercise";

const addMock = vi.fn();

vi.mock("../../data/repositories/ExerciseRepository", () => ({
  exerciseRepository: {
    add: (...args: unknown[]) => addMock(...args),
  },
}));

describe("createCustomExercise", () => {
  beforeEach(() => {
    addMock.mockReset();
    addMock.mockResolvedValue(undefined);
  });

  it("stores the selected primary muscle and equipment on the new exercise", async () => {
    const result = await createCustomExercise(
      {
        name: "Tempo Bench",
        primaryMuscle: MuscleGroup.CHEST,
        loadType: LoadType.DUMBBELL,
      },
      [],
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.exercise.primaryMuscle).toBe(MuscleGroup.CHEST);
    expect(result.exercise.loadType).toBe(LoadType.DUMBBELL);
    expect(addMock).toHaveBeenCalledWith(result.exercise);
  });
});
