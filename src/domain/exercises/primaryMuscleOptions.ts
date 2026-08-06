import { MuscleGroup, type MuscleGroup as MuscleGroupType } from "../types/MuscleGroup";

export const SELECTABLE_PRIMARY_MUSCLES: MuscleGroupType[] = (
  Object.values(MuscleGroup) as MuscleGroupType[]
)
  .filter(
    (muscle) =>
      muscle !== MuscleGroup.UNKNOWN && muscle !== MuscleGroup.QUADS,
  )
  .sort((a, b) => a.localeCompare(b));

export const DEFAULT_PRIMARY_MUSCLE = MuscleGroup.CHEST;
