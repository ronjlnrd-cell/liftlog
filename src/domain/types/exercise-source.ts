export const ExerciseSource = {
  BUILT_IN: "BUILT_IN",
  USER: "USER",
  CUSTOM: "CUSTOM",
} as const;

export type ExerciseSource =
  (typeof ExerciseSource)[keyof typeof ExerciseSource];