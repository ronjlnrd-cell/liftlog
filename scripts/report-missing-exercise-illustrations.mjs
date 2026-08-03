import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const exerciseFiles = [
  "src/data/builtinExercises/legacyExercises.ts",
  "src/data/builtinExercises/expandedExercises.ts",
];
const illustrationDir = join(root, "src/assets/exercises");
const outputPath = join(root, "missing-exercise-illustrations.csv");

const rowPattern =
  /\["(builtin-[^"]+)",\s*"([^"]+)",\s*MuscleGroup\.(\w+),\s*MovementPattern\.(\w+),/g;

function formatLabel(value) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeCsv(value) {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function readExercises() {
  const exercises = [];

  for (const file of exerciseFiles) {
    const text = readFileSync(join(root, file), "utf8");
    for (const match of text.matchAll(rowPattern)) {
      exercises.push({
        id: match[1],
        name: match[2],
        primaryMuscle: match[3],
        movementPattern: match[4],
      });
    }
  }

  return exercises;
}

function readIllustrationIds() {
  const ids = new Set();

  for (const entry of readdirSync(illustrationDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;

    const match = entry.name.match(/^(.+)\.(svg|png)$/i);
    if (!match || match[1] === "placeholder") continue;

    ids.add(match[1]);
  }

  return ids;
}

function hasIllustration(exerciseId, illustrationIds) {
  if (illustrationIds.has(exerciseId)) return true;

  return (
    existsSync(join(illustrationDir, `${exerciseId}.svg`)) ||
    existsSync(join(illustrationDir, `${exerciseId}.png`))
  );
}

const exercises = readExercises();
const illustrationIds = readIllustrationIds();
const missing = exercises
  .filter((exercise) => !hasIllustration(exercise.id, illustrationIds))
  .sort((left, right) => left.name.localeCompare(right.name));

const header = [
  "exercise id",
  "exercise name",
  "primary muscle",
  "movement pattern",
];

const lines = [
  header.join(","),
  ...missing.map((exercise) =>
    [
      escapeCsv(exercise.id),
      escapeCsv(exercise.name),
      escapeCsv(formatLabel(exercise.primaryMuscle)),
      escapeCsv(formatLabel(exercise.movementPattern)),
    ].join(","),
  ),
];

writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");

console.log(`Built-in exercises: ${exercises.length}`);
console.log(`Illustrations found: ${exercises.length - missing.length}`);
console.log(`Missing illustrations: ${missing.length}`);
console.log(`Report written to ${outputPath}`);
