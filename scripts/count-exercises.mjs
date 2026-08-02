import { readFileSync } from "node:fs";

const files = [
  "src/data/builtinExercises/legacyExercises.ts",
  "src/data/builtinExercises/expandedExercises.ts",
];

const rows = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const pattern = /\["(builtin-[^"]+)",\s*"([^"]+)"/g;
  for (const match of text.matchAll(pattern)) {
    rows.push({ id: match[1], name: match[2], file });
  }
}

console.log("Total exercises:", rows.length);

const idCounts = new Map();
const nameCounts = new Map();
for (const row of rows) {
  idCounts.set(row.id, (idCounts.get(row.id) ?? 0) + 1);
  nameCounts.set(row.name, (nameCounts.get(row.name) ?? 0) + 1);
}

const duplicateIds = [...idCounts.entries()].filter(([, count]) => count > 1);
const duplicateNames = [...nameCounts.entries()].filter(([, count]) => count > 1);

if (duplicateIds.length) {
  console.log("\nDuplicate IDs:");
  for (const [id, count] of duplicateIds) console.log(`  ${id}: ${count}`);
}
if (duplicateNames.length) {
  console.log("\nDuplicate names:");
  for (const [name, count] of duplicateNames) console.log(`  ${name}: ${count}`);
}

const musclePattern = /MuscleGroup\.([A-Z_]+)/;
const loadPattern = /LoadType\.([A-Z_]+)/;

const byMuscle = {};
const byLoad = {};
for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  for (const line of lines) {
    if (!line.includes('["builtin-')) continue;
    const name = line.match(/,\s*"([^"]+)"/)?.[1];
    const muscle = line.match(musclePattern)?.[1];
    const load = line.match(loadPattern)?.[1];
    if (!name || !muscle || !load) continue;
    byMuscle[muscle] = (byMuscle[muscle] ?? 0) + 1;
    byLoad[load] = (byLoad[load] ?? 0) + 1;
  }
}

console.log("\nBy muscle:");
for (const [muscle, count] of Object.entries(byMuscle).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${muscle}: ${count}`);
}

console.log("\nBy load type:");
for (const [load, count] of Object.entries(byLoad).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${load}: ${count}`);
}

const equipment = {
  BARBELL: 0,
  DUMBBELL: 0,
  CABLE: 0,
  MACHINE: 0,
  BODYWEIGHT: 0,
  KETTLEBELL: 0,
  RESISTANCE_BAND: 0,
  EZ_BAR: 0,
  SMITH_MACHINE: 0,
  OTHER: 0,
};

for (const row of rows) {
  const line = readFileSync(row.file, "utf8").split("\n").find((l) => l.includes(`"${row.id}"`)) ?? "";
  const load = line.match(loadPattern)?.[1] ?? "OTHER";
  const lower = row.name.toLowerCase();

  if (lower.includes("smith machine")) equipment.SMITH_MACHINE += 1;
  else if (lower.includes("kettlebell")) equipment.KETTLEBELL += 1;
  else if (lower.includes("resistance band") || (lower.includes("band") && load === "OTHER")) equipment.RESISTANCE_BAND += 1;
  else if (lower.includes("ez-bar")) equipment.EZ_BAR += 1;
  else if (load === "BARBELL") equipment.BARBELL += 1;
  else if (load === "DUMBBELL") equipment.DUMBBELL += 1;
  else if (load === "CABLE") equipment.CABLE += 1;
  else if (load === "MACHINE") equipment.MACHINE += 1;
  else if (load === "BODYWEIGHT") equipment.BODYWEIGHT += 1;
  else equipment.OTHER += 1;
}

console.log("\nBy equipment (derived):");
for (const [type, count] of Object.entries(equipment).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type}: ${count}`);
}
