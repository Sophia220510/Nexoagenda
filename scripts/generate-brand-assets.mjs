import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const source = join(root, "public/brand/nexo-app-icon-source.png");
const output = join(root, "public/brand");
await mkdir(output, { recursive: true });

// Crop the supplied 2000px white canvas to the mark's measured bounds.
// Sharp's automatic trim introduced dark edge artifacts on this PNG.
const mark = await sharp(source)
  .extract({ left: 250, top: 245, width: 1460, height: 1460 })
  .png()
  .toBuffer();

async function icon(name, size, occupancy) {
  const markSize = Math.round(size * occupancy);
  const resized = await sharp(mark).resize(markSize, markSize, { fit: "contain" }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: "#ffffff" } })
    .composite([{ input: resized, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toFile(join(output, name));
}

await Promise.all([
  icon("app-192.png", 192, 0.72),
  icon("app-512.png", 512, 0.72),
  icon("maskable-192.png", 192, 0.58),
  icon("maskable-512.png", 512, 0.58),
  icon("apple-touch-icon.png", 180, 0.72),
  icon("favicon-16.png", 16, 0.84),
  icon("favicon-32.png", 32, 0.84),
]);

const ogLogo = await sharp(mark).resize(270, 270, { fit: "contain" }).png().toBuffer();
const ogText = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#f7f8f4"/>
  <rect x="42" y="42" width="1116" height="546" rx="32" fill="#ffffff" stroke="#e3e9db" stroke-width="2"/>
  <text x="425" y="272" font-family="Arial,sans-serif" font-size="74" font-weight="700" fill="#17231b">NEXO Book</text>
  <text x="428" y="341" font-family="Arial,sans-serif" font-size="29" fill="#425348">Agenda e gestão inteligente para negócios</text>
  <rect x="428" y="377" width="144" height="7" rx="3" fill="#abd448"/>
</svg>`);
await sharp(ogText).composite([{ input: ogLogo, left: 106, top: 177 }]).png().toFile(join(output, "opengraph.png"));
