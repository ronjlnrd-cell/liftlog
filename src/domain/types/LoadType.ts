export const LoadType = {
  UNKNOWN: "UNKNOWN",
  BARBELL: "BARBELL",
  DUMBBELL: "DUMBBELL",
  MACHINE: "MACHINE",
  CABLE: "CABLE",
  BODYWEIGHT: "BODYWEIGHT",
  OTHER: "OTHER",
} as const;

export type LoadType = (typeof LoadType)[keyof typeof LoadType];