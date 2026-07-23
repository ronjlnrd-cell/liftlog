export interface Profile {
  id: "profile";
  bodyweight: number | null;
  gender: "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";
  weightUnit: "KG" | "LB";
}
