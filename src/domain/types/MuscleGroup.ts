export const MuscleGroup = {
  UNKNOWN: "UNKNOWN",
  CHEST: "CHEST",
  BACK: "BACK",
  SHOULDERS: "SHOULDERS",
  BICEPS: "BICEPS",
  TRICEPS: "TRICEPS",
  QUADRICEPS: "QUADRICEPS",
  HAMSTRINGS: "HAMSTRINGS",
  GLUTES: "GLUTES",
  CALVES: "CALVES",
  CORE: "CORE",
  QUADS: "Quads",
} as const;

export type MuscleGroup =
  (typeof MuscleGroup)[keyof typeof MuscleGroup];