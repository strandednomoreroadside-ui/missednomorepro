// Deterministically rasterize the approved vector app mark for browsers and
// install surfaces that do not accept SVG icons. Run after changing app-icon.svg.
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const source = await readFile(new URL("../public/app-icon.svg", import.meta.url));
const outputDir = new URL("../public/icons/", import.meta.url);
await mkdir(outputDir, { recursive: true });

for (const size of [32, 180, 192, 512]) {
  await sharp(source)
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9, palette: true })
    .toFile(fileURLToPath(new URL(`icon-${size}.png`, outputDir)));
}

console.log("Generated 32, 180, 192, and 512px application icons.");
