import sharp from "sharp";
import { readdirSync } from "node:fs";
import { rename, unlink } from "node:fs/promises";
import { join } from "node:path";

const illustrationDir = join(process.cwd(), "src/assets/exercises");

for (const file of readdirSync(illustrationDir)) {
  if (!file.endsWith(".png")) continue;

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
