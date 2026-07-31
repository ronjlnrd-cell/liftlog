export type StrengthLevel = "Beginner" | "Novice" | "Intermediate" | "Advanced" | "Elite";
type Gender = "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";

const levels: StrengthLevel[] = ["Beginner","Novice","Intermediate","Advanced","Elite"];

const standards: Record<string, { MALE: number[]; FEMALE: number[] }> = {
  "builtin-bench-press": { MALE: [0.50, 1.00, 1.25, 1.50, 2.00], FEMALE: [0.30, 0.50, 0.75, 1.10, 1.45] },
  "builtin-squat": { MALE: [0.75, 1.25, 1.75, 2.25, 2.75], FEMALE: [0.50, 0.75, 1.25, 1.75, 2.25] },
  "builtin-deadlift": { MALE: [1.00, 1.50, 2.00, 2.50, 3.25], FEMALE: [0.75, 1.00, 1.50, 2.00, 2.50] },
  "builtin-ohp": { MALE: [0.35, 0.55, 0.80, 1.05, 1.35], FEMALE: [0.20, 0.35, 0.50, 0.70, 0.95] },
};

export function getStrengthLevel(
  exerciseId: string,
  estimated1RM: number,
  bodyweight: number | null,
  gender: Gender,
): StrengthLevel | null {
  if (!bodyweight || bodyweight <= 0 || (gender !== "MALE" && gender !== "FEMALE")) return null;
  const standard = standards[exerciseId];
  if (!standard) return null;
  const ratio = estimated1RM / bodyweight;
  const thresholds = standard[gender];
  if (ratio < thresholds[0]) return null;
  let result: StrengthLevel = "Beginner";
  for (let i=1; i<thresholds.length; i++) {
    if (ratio >= thresholds[i]) result = levels[i];
  }
  return result;
}

export function hasStrengthStandard(exerciseId: string): boolean {
  return exerciseId in standards;
}
