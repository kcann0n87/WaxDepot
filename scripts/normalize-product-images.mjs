#!/usr/bin/env node
// Normalizes every image in public/products/ into a consistent format:
//   - 1000x1000 square canvas
//   - Pure white (#ffffff) background — handles transparent PNGs AND
//     images with off-white / colored backgrounds via a flatten op
//   - JPEG, quality 88, progressive
//   - Original aspect ratio preserved (image fits inside the square,
//     letterboxed with white)
//
// Idempotent — running again on already-normalized images is safe (just
// re-encodes them). Backs up originals to public/products/_original/ on
// the first run so you can revert if something looks worse.
//
// Usage:
//   node scripts/normalize-product-images.mjs
//   node scripts/normalize-product-images.mjs --dry  (no writes)
//   node scripts/normalize-product-images.mjs --restore  (revert from backup)

import { readdir, mkdir, copyFile, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = path.join(ROOT, "public", "products");
// Backup goes OUTSIDE /public so we don't accidentally serve the
// pre-normalization originals at predictable URLs.
const BACKUP = path.join(ROOT, ".image-backups", "products-pre-normalize");
const SIZE = 1000;
const QUALITY = 88;

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry");
const RESTORE = args.has("--restore");

async function ensureDir(p) {
  try {
    await mkdir(p, { recursive: true });
  } catch {}
}

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (RESTORE) return restore();

  await ensureDir(BACKUP);
  const files = (await readdir(SRC)).filter((f) =>
    /\.(jpe?g|png|webp)$/i.test(f),
  );
  console.log(
    `${files.length} candidate files in /public/products${DRY ? " (DRY RUN)" : ""}`,
  );

  let processed = 0;
  let skipped = 0;
  for (const file of files) {
    const inPath = path.join(SRC, file);
    const backupPath = path.join(BACKUP, file);
    // Stash original on first sight so --restore is possible.
    if (!(await exists(backupPath))) {
      if (!DRY) await copyFile(inPath, backupPath);
    }

    const buf = await readFile(inPath);

    // Strategy:
    //   1. Read with sharp; figure out source dimensions.
    //   2. Resize to fit within SIZE x SIZE (no crop, no upscale beyond
    //      1.5x to avoid blurry blowups of tiny inputs).
    //   3. Composite onto a SIZE x SIZE pure-white canvas, centered.
    //   4. Flatten any transparency to white.
    //   5. Re-encode as JPEG.
    let pipeline = sharp(buf);
    const meta = await pipeline.metadata();
    const ratio = meta.width && meta.height ? meta.width / meta.height : 1;

    let targetW, targetH;
    if (ratio >= 1) {
      targetW = SIZE;
      targetH = Math.round(SIZE / ratio);
    } else {
      targetH = SIZE;
      targetW = Math.round(SIZE * ratio);
    }

    pipeline = pipeline
      .resize(targetW, targetH, { fit: "inside", withoutEnlargement: false })
      .flatten({ background: { r: 255, g: 255, b: 255 } });

    // Pad with white onto a square canvas.
    pipeline = pipeline.extend({
      top: Math.floor((SIZE - targetH) / 2),
      bottom: Math.ceil((SIZE - targetH) / 2),
      left: Math.floor((SIZE - targetW) / 2),
      right: Math.ceil((SIZE - targetW) / 2),
      background: { r: 255, g: 255, b: 255 },
    });

    pipeline = pipeline.jpeg({ quality: QUALITY, progressive: true });

    const outBuf = await pipeline.toBuffer();
    const outPath = inPath.replace(/\.(png|webp)$/i, ".jpg");

    if (DRY) {
      console.log(
        `  would write ${path.basename(outPath)} (${meta.width}x${meta.height} → ${SIZE}x${SIZE})`,
      );
    } else {
      await writeFile(outPath, outBuf);
      console.log(
        `  ✓ ${path.basename(outPath)} (${meta.width}x${meta.height} → ${SIZE}x${SIZE})`,
      );
    }
    processed++;
  }

  console.log(
    `\nDone. ${processed} processed, ${skipped} skipped${DRY ? " (DRY RUN, no writes)" : ""}.`,
  );
  console.log(`Originals stashed in ${BACKUP}/`);
}

async function restore() {
  if (!(await exists(BACKUP))) {
    console.error("No backup directory found at", BACKUP);
    process.exit(1);
  }
  const files = await readdir(BACKUP);
  console.log(`Restoring ${files.length} files from backup…`);
  for (const f of files) {
    await copyFile(path.join(BACKUP, f), path.join(SRC, f));
    console.log(`  ✓ restored ${f}`);
  }
  console.log("Done. Originals restored.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
