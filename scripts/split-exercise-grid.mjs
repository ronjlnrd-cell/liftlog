import sharp from "sharp";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const sourcePath = process.argv[2];
const scale = Number(process.argv[3] ?? 4);
const batchPath = process.argv[4];
const outputDir = join(root, "src/assets/exercises");

if (!sourcePath || !batchPath) {
  console.error(
    "Usage: node scripts/split-exercise-grid.mjs <grid-image-path> [scale] <batch-json>",
  );
  process.exit(1);
}

const exerciseIds = JSON.parse(readFileSync(batchPath, "utf8"));

const image = sharp(sourcePath);
const { width, height } = await image.metadata();

if (!width || !height) {
  throw new Error("Could not read image dimensions.");
}

const rows = exerciseIds.length;
const columns = exerciseIds[0]?.length ?? 0;

if (!rows || !columns || exerciseIds.some((row) => row.length !== columns)) {
  throw new Error("Batch JSON must be a rectangular grid of exercise ids.");
}

const cellWidth = Math.floor(width / columns);
const cellHeight = Math.floor(height / rows);

for (let row = 0; row < rows; row += 1) {
  for (let col = 0; col < columns; col += 1) {
    const exerciseId = exerciseIds[row][col];
    const outputPath = join(outputDir, `${exerciseId}.png`);

    await sharp(sourcePath)
      .extract({
        left: col * cellWidth,
        top: row * cellHeight,
        width: cellWidth,
        height: cellHeight,
      })
      .resize(cellWidth * scale, cellHeight * scale, {
        kernel: sharp.kernel.lanczos3,
      })
      .sharpen({ sigma: 1, m1: 0.8, m2: 0.35 })
      .png({ compressionLevel: 6, effort: 10 })
      .toFile(outputPath);

    console.log(`Saved ${exerciseId}.png (${cellWidth * scale}x${cellHeight * scale})`);
  }
}

console.log(`Split ${rows * columns} illustrations from ${sourcePath} at ${scale}x`);
