import sharp from "sharp";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const assetsDir =
  "C:/Users/ronja/.cursor/projects/c-Users-ronja-liftlog/assets/c__Users_ronja_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_ChatGPT_Image_Aug_3__2026__";

const manifest = {
  "batch-1-core.json": "03_29_40_PM-6e3995b1-ad2b-4113-b9a3-4c819bde8560.png",
  "batch-2-barbell.json": "03_45_18_PM-43ec15f1-30b0-4151-852e-ee980626fda3.png",
  "batch-3-barbell-2.json": "03_49_01_PM-5f587702-9f82-49e0-a67f-4a445175d083.png",
  "batch-4-bench-cable.json": "03_54_35_PM-cb82db8b-a6cd-4429-9de2-9f455e12d52d.png",
  "batch-5-cable.json": "03_59_42_PM-bd761676-7d24-4e83-8c8d-79aee117f6fe.png",
  "batch-6-mixed.json": "04_03_23_PM-b4e56b76-5eb6-4e07-a243-aed5e539e3b5.png",
  "batch-7-deadlift-decline.json": "04_04_30_PM-36029376-40f5-40d2-bce7-c318efa81072.png",
  "batch-8-dumbbell-ez.json": "04_07_50_PM-5af1d9b5-b908-45c3-94cc-1e9ee551a71a.png",
  "batch-9-hang-incline.json": "04_09_35_PM-52a207dc-c75f-4530-bcb3-0b374482c349.png",
  "batch-10-kettlebell-landmine.json": "04_12_38_PM-0bf2bb7c-b818-4d96-b675-ecc3a9e2c9ff.png",
  "batch-11-dumbbell.json": "04_14_23_PM-49838775-7666-4225-a17a-b59c64e7dd02.png",
  "batch-12-good-morning-kettlebell.json": "04_16_22_PM-4cd9e5e2-ce50-45be-b896-49f45f238c34.png",
  "batch-13-machine.json": "04_18_13_PM-2646a3ab-3725-40b4-813f-b58b271b847c.png",
  "batch-14-push-pull.json": "04_23_04_PM-48474310-3783-43fa-a9a0-fe0ef770b696.png",
  "batch-15-resistance-reverse.json": "04_24_41_PM-3845c7e2-d40c-4f79-b064-be3f08e3e444.png",
  "batch-16-single-limb.json": "04_26_09_PM-bd74a3db-ecc7-41ff-8379-bee8bd82b1bf.png",
  "batch-17-overhead-row.json": "04_28_12_PM-a57917db-5cef-416e-a979-17038dab03a5.png",
  "batch-18-seated.json": "04_29_34_PM-f8812503-2d49-499e-9795-ab6c892e3fd3.png",
  "batch-19-leg-pull-band.json": "04_36_50_PM-c66ccb65-e785-4014-96b6-ec37692e9449.png",
  "batch-20-smith.json": "04_39_22_PM-109473f8-6530-4de3-a56a-7c57e6d0dc4b.png",
  "batch-21-squat-deadlift.json": "04_41_51_PM-3d07803d-b966-4023-8edd-c5a20c373391.png",
  "batch-22-final.json": "04_47_21_PM-7d4ae488-b1f5-4ee6-8683-49df681e5357.png",
  "batch-23-complete.json": "04_48_45_PM-7e70abdc-06d1-4385-9690-e0f07e00995e.png",
};

// Row 3 of batch 14 has irregular 2+1+1+2 layout; keep tuned bounds.
const manualRowBounds = {
  "batch-14-push-pull.json": {
    2: [
      { left: 0, width: 204 },
      { left: 205, width: 198 },
      { left: 404, width: 219 },
      { left: 624, width: 400 },
    ],
  },
};

function readExerciseRows(batchPath) {
  const batch = JSON.parse(readFileSync(batchPath, "utf8"));
  const rows = batch.rows ?? batch;
  return rows.map((row) =>
    row.map((cell) => {
      if (!cell) return null;
      if (typeof cell === "string") return cell;
      return cell.id ?? null;
    }),
  );
}

async function rowBounds(path, row, rowCount, expectedCols) {
  const { width, height } = await sharp(path).metadata();
  const cellHeight = Math.floor(height / rowCount);
  const top = row * cellHeight;
  const minCell = Math.floor(width / (expectedCols + 0.75));
  const { data } = await sharp(path)
    .extract({ left: 0, top, width, height: cellHeight })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const scores = [];
  for (let x = 20; x < width - 20; x += 1) {
    let gray = 0;
    for (let y = 0; y < cellHeight; y += 1) {
      const i = (y * width + x) * 3;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const avg = (r + g + b) / 3;
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      if (spread < 18 && avg > 170 && avg < 240) gray += 1;
    }
    scores.push({ x, gray });
  }

  const minGray = cellHeight * 0.45;
  const candidates = scores.filter(
    (s) => s.gray >= minGray && s.x >= minCell && s.x <= width - minCell,
  );
  candidates.sort((a, b) => b.gray - a.gray);

  const picked = [];
  for (const c of candidates) {
    if (picked.some((p) => Math.abs(p - c.x) < minCell * 0.6)) continue;
    picked.push(c.x);
    if (picked.length === expectedCols - 1) break;
  }
  picked.sort((a, b) => a - b);

  while (picked.length < expectedCols - 1) {
    const step = width / expectedCols;
    for (let i = 1; i < expectedCols && picked.length < expectedCols - 1; i += 1) {
      const x = Math.round(step * i);
      if (!picked.some((p) => Math.abs(p - x) < minCell * 0.5)) picked.push(x);
    }
    picked.sort((a, b) => a - b);
    break;
  }
  picked.splice(expectedCols - 1);

  const bounds = [0, ...picked, width];
  return bounds.slice(0, -1).map((left, i) => ({
    left: i === 0 ? 0 : left + 1,
    width: bounds[i + 1] - (i === 0 ? 0 : left + 1),
  }));
}

function mergeCells(cells, groupSize) {
  const merged = [];
  for (let i = 0; i < cells.length; i += groupSize) {
    const group = cells.slice(i, i + groupSize);
    const left = group[0].left;
    const right = group[group.length - 1].left + group[group.length - 1].width;
    merged.push({ left, width: right - left });
  }
  return merged;
}

function cellQuality(cells) {
  const widths = cells.map((c) => c.width);
  return Math.max(...widths) / Math.min(...widths);
}

async function boundsForRow(path, row, rowCount, exerciseIds, gridCols, manual, row0Cols) {
  if (manual) {
    return manual.slice(0, exerciseIds.length);
  }

  const count = exerciseIds.length;
  if (count === gridCols) {
    return rowBounds(path, row, rowCount, gridCols);
  }

  if (gridCols === 6 && count === 3 && row0Cols?.length === 6) {
    return [
      row0Cols[0],
      row0Cols[1],
      {
        left: row0Cols[2].left,
        width: row0Cols[2].width + row0Cols[3].width,
      },
    ];
  }

  if (gridCols % count === 0) {
    const base = await rowBounds(path, row, rowCount, gridCols);
    return mergeCells(base, gridCols / count);
  }

  const direct = await rowBounds(path, row, rowCount, count);
  if (cellQuality(direct) <= 2.8) {
    return direct;
  }

  return direct;
}

async function buildBatchConfig(batchFile, imagePath, exerciseRows) {
  const gridCols = Math.max(
    ...exerciseRows.map((row) => row.filter(Boolean).length),
  );
  const rowCount = exerciseRows.length;
  const manual = manualRowBounds[batchFile] ?? {};
  const row0Cols = await rowBounds(imagePath, 0, rowCount, gridCols);

  const rows = [];
  for (let row = 0; row < rowCount; row += 1) {
    const exerciseIds = exerciseRows[row].filter(Boolean);
    const bounds = await boundsForRow(
      imagePath,
      row,
      rowCount,
      exerciseIds,
      gridCols,
      manual[row],
      row0Cols,
    );

    rows.push(
      exerciseIds.map((id, index) => ({
        id,
        left: bounds[index].left,
        width: bounds[index].width,
      })),
    );
  }

  const lastRow = rows[rowCount - 1];
  if (lastRow.length === 1 && rows[0]?.length > 0) {
    lastRow[0].width = rows[0][0].width;
  }

  return { rows };
}

const startFrom = process.argv[2] ?? null;
let started = !startFrom;

for (const [batchFile, imageName] of Object.entries(manifest)) {
  if (!started) {
    if (batchFile === startFrom) started = true;
    else continue;
  }

  const batchPath = join(root, "scripts/grid-batches", batchFile);
  const imagePath = assetsDir + imageName;
  const exerciseRows = readExerciseRows(batchPath);
  const config = await buildBatchConfig(batchFile, imagePath, exerciseRows);

  writeFileSync(batchPath, `${JSON.stringify(config, null, 2)}\n`);

  let result;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    result = spawnSync(
      "node",
      ["scripts/split-exercise-grid.mjs", imagePath, "4", batchPath],
      { cwd: root, stdio: "inherit" },
    );
    if (result.status === 0) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Regenerated all grid batches and illustrations.");
