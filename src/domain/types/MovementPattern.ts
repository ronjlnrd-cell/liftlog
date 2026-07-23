export const MovementPattern = {
  UNKNOWN: "UNKNOWN",
  HORIZONTAL_PUSH: "HORIZONTAL_PUSH",
  HORIZONTAL_PULL: "HORIZONTAL_PULL",
  VERTICAL_PUSH: "VERTICAL_PUSH",
  VERTICAL_PULL: "VERTICAL_PULL",
  SQUAT: "SQUAT",
  HINGE: "HINGE",
  CARRY: "CARRY",
  ISOLATION: "ISOLATION",
} as const;

export type MovementPattern =
  (typeof MovementPattern)[keyof typeof MovementPattern];