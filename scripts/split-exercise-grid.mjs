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

const batch = JSON.parse(readFileSync(batchPath, "utf8"));
const gridColumns = batch.columns ?? null;
const exerciseRows = batch.rows ?? batch;

const image = sharp(sourcePath);
const { width, height } = await image.metadata();

if (!width || !height) {
  throw new Error("Could not read image dimensions.");
}

const rows = exerciseRows.length;

if (!rows || exerciseRows.some((row) => !Array.isArray(row) || row.length === 0)) {
  throw new Error("Batch JSON must be an array of exercise id rows.");
}

function parseCell(cell) {
  if (!cell) {
    return { id: null, span: 1 };
  }
  if (typeof cell === "string") {
    return { id: cell, span: 1 };
  }
  return {
    id: cell.id ?? null,
    span: cell.span ?? 1,
    left: cell.left,
    width: cell.width,
  };
}

const cellHeight = Math.floor(height / rows);
let illustrationCount = 0;

for (let row = 0; row < rows; row += 1) {
  const rowCells = exerciseRows[row].map(parseCell);
  const columns = gridColumns ?? rowCells.length;
  const cellWidth = Math.floor(width / columns);
  let column = 0;

  for (let index = 0; index < rowCells.length; index += 1) {
    const { id, span, left: explicitLeft, width: explicitWidth } = rowCells[index];
    const left =
      explicitLeft ?? column * cellWidth;
    const isLastCell = index === rowCells.length - 1;
    const extractWidth =
      explicitWidth ?? (isLastCell ? width - left : span * cellWidth);

    if (id) {
      const outputPath = join(outputDir, `${id}.png`);

      await sharp(sourcePath)
        .extract({
          left,
          top: row * cellHeight,
          width: extractWidth,
          height: cellHeight,
        })
        .resize(extractWidth * scale, cellHeight * scale, {
          kernel: sharp.kernel.lanczos3,
        })
        .png({ compressionLevel: 6, effort: 10 })
        .toFile(outputPath);

      illustrationCount += 1;
      console.log(`Saved ${id}.png (${extractWidth * scale}x${cellHeight * scale})`);
    }

    column += explicitWidth ? Math.ceil(explicitWidth / cellWidth) : span;
  }
}

console.log(`Split ${illustrationCount} illustrations from ${sourcePath} at ${scale}x`);
