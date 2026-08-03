import sharp from "sharp";
import { readdirSync } from "node:fs";
import { rename, unlink } from "node:fs/promises";
import { join } from "node:path";

// Do not run this on the full library — repeated sharpening degrades line art.
// Only use on specific files if needed: node scripts/sharpen-exercise-illustrations.mjs <file.png>
const illustrationDir = join(process.cwd(), "src/assets/exercises");
const targetFiles = process.argv.slice(2);

const files =
  targetFiles.length > 0
    ? targetFiles.map((file) => (file.endsWith(".png") ? file : `${file}.png`))
    : readdirSync(illustrationDir).filter((file) => file.endsWith(".png"));

if (targetFiles.length === 0 && files.length > 10) {
  console.error(
    "Refusing to sharpen the entire library. Pass specific filenames, or run on <=10 files only.",
  );
  process.exit(1);
}

for (const file of files) {

  const path = join(illustrationDir, file);
  const tempPath = `${path}.tmp.png`;

  await sharp(path)
    .sharpen({ sigma: 0.9, m1: 0.8, m2: 0.35 })
    .png({ compressionLevel: 6, effort: 10 })
    .toFile(tempPath);

  await unlink(path);
  await rename(tempPath, path);

  const { width, height } = await sharp(path).metadata();
  console.log(`Sharpened ${file} (${width}x${height})`);
}
