/**
 * Regenerates the app icons and the Open Graph card from the brand logo.
 *
 *   node apps/web/scripts/generate-icons.mjs
 *
 * Run this whenever public/assets/images/logo.svg changes. Everything it
 * writes is committed, so the build itself never needs sharp.
 *
 * The mark is drawn on a solid brand-dark plate rather than left transparent:
 * a tab strip, an iOS home screen and a search result all paint their own
 * background, and gold-on-nothing disappears against half of them. iOS in
 * particular fills transparency with black and applies its own corner mask,
 * so apple-icon is a full-bleed square with the rounding left to the OS.
 */
import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(webRoot, "src/app");
const logoPath = path.join(webRoot, "public/assets/images/logo.svg");
const posterPath = path.join(webRoot, "public/assets/videos/loop-poster.jpg");

const PLATE = "#0b0b0b";
const GOLD = "#fab404";

// The logo's artwork sits off-centre inside its own 1254×1254 viewBox, so the
// path is re-fitted here instead of being scaled as-is. Measured from the
// rendered alpha channel; re-measure if the artwork is redrawn.
const ART = { x: 228, y: 44, w: 798, h: 1166, viewBox: 1254 };

/** The mark, re-fitted and centred on a `size`×`size` canvas with `pad` inset. */
function markSvg({ size = 1024, pad = 0.14, plate = null, radius = null, d }) {
  const box = size * (1 - pad * 2);
  const scale = Math.min(box / ART.w, box / ART.h);
  const tx = (size - ART.w * scale) / 2 - ART.x * scale;
  const ty = (size - ART.h * scale) / 2 - ART.y * scale;
  const bg = plate
    ? `<rect width="${size}" height="${size}"${radius ? ` rx="${radius}"` : ""} fill="${plate}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bg}<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(5)})"><path d="${d}" fill="${GOLD}"/></g></svg>`;
}

const png = (svg, size) =>
  sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toBuffer();

async function main() {
  const logo = await readFile(logoPath, "utf8");
  // Only the first path carries artwork; the file ends with two empty ones.
  const d = logo.match(/<path d="(M[^"]+)"/)?.[1];
  if (!d) throw new Error(`no path data in ${logoPath}`);

  await mkdir(appDir, { recursive: true });

  // icon.svg — the one modern browsers actually pick. Rounded so it reads as a
  // deliberate app tile rather than a cropped square in tab strips.
  const scalable = markSvg({ size: 1024, plate: PLATE, radius: 224, d });
  await writeFile(path.join(appDir, "icon.svg"), `${scalable}\n`);

  // favicon.ico — legacy fallback. 16px is a smudge at 14% inset, so the
  // smaller sizes get less padding to keep the mark's stroke readable.
  const icoSizes = [
    [16, 0.06],
    [32, 0.08],
    [48, 0.1],
  ];
  const ico = await Promise.all(
    icoSizes.map(([size, pad]) => png(markSvg({ size: 1024, pad, plate: PLATE, d }), size)),
  );
  await writeFile(
    path.join(appDir, "favicon.ico"),
    buildIco(ico, icoSizes.map(([size]) => size)),
  );

  // apple-icon.png — square and full-bleed; iOS rounds it itself.
  await writeFile(
    path.join(appDir, "apple-icon.png"),
    await png(markSvg({ size: 1024, pad: 0.18, plate: PLATE, d }), 180),
  );

  // opengraph-image.png — the hero still, which is what the site actually looks
  // like, with the mark set into a corner so a cropped preview still brands.
  const badge = await png(markSvg({ size: 1024, pad: 0.16, plate: PLATE, radius: 224, d }), 96);
  await sharp(posterPath)
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .composite([{ input: badge, top: 630 - 96 - 40, left: 40 }])
    .png()
    .toFile(path.join(appDir, "opengraph-image.png"));

  console.log("wrote icon.svg, favicon.ico, apple-icon.png, opengraph-image.png");
}

/** Minimal ICO container — one PNG-compressed entry per size. */
function buildIco(pngs, sizes) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);

  let offset = 6 + pngs.length * 16;
  const entries = pngs.map((buf, i) => {
    const size = sizes[i];
    const e = Buffer.alloc(16);
    e.writeUInt8(size === 256 ? 0 : size, 0); // width
    e.writeUInt8(size === 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    return e;
  });

  return Buffer.concat([header, ...entries, ...pngs]);
}

main();
