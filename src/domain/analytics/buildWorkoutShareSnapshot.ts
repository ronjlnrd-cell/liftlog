import {
  getWorkoutShareSnapshotData,
  type GetWorkoutShareSnapshotDataInput,
} from "./workoutShareSnapshotData";

export type BuildWorkoutShareSnapshotInput = GetWorkoutShareSnapshotDataInput;

export function buildWorkoutShareSnapshot(
  input: BuildWorkoutShareSnapshotInput,
): string {
  const data = getWorkoutShareSnapshotData(input);
  const unitLabel = input.unit.toLowerCase();
  const lines: string[] = [`${data.appName} Workout`, ""];

  if (data.achievements.length > 0) {
    for (const achievement of data.achievements) {
      lines.push(`${achievement.icon} ${achievement.title}`);
    }
    lines.push("");
  }

  lines.push(data.timestamp);
  lines.push(data.summary);
  lines.push("");

  for (const exercise of data.exercises) {
    lines.push(exercise.name);
    lines.push(
      exercise.sets
        .map((set) => {
          const prefix = set.isPR ? "🏆 " : "";
          return `${prefix}${set.weight} ${unitLabel} × ${set.reps}`;
        })
        .join(" · "),
    );
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
