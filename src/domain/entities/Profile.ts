export interface Profile {
  id: "profile";
  gender: "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";
  weightUnit: "KG" | "LB";
  userId?: string;
  setupCompleted?: boolean;
  cycleTrackingEnabled?: boolean;
}
