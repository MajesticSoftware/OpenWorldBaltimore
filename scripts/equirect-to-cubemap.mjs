import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// Proper equirectangular to cubemap face conversion
// For each pixel on a cubemap face, compute the 3D direction vector,
// then map it back to the equirectangular panorama coordinates.
async function equirectToCubemap(inputPath, outputDir, faceSize = 512) {
  fs.mkdirSync(outputDir, { recursive: true });

  // Flip vertically first — these panoramas have sky at bottom, ground at top
  const img = sharp(inputPath).flip();
  const meta = await sharp(inputPath).metadata();
  const srcW = meta.width;
  const srcH = meta.height;

  // Read raw pixel data from flipped image
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels; // 4 (RGBA)

  function samplePanorama(x, y, z) {
    // Convert 3D direction to equirectangular UV
    const len = Math.sqrt(x * x + y * y + z * z);
    x /= len; y /= len; z /= len;

    const u = 0.5 + Math.atan2(z, x) / (2 * Math.PI);
    const v = 0.5 - Math.asin(y) / Math.PI;

    // Sample the panorama
    const px = Math.floor(((u % 1 + 1) % 1) * srcW) % srcW;
    const py = Math.max(0, Math.min(srcH - 1, Math.floor(v * srcH)));
    const idx = (py * srcW + px) * channels;
    return [data[idx], data[idx + 1], data[idx + 2]];
  }

  // Face definitions: for each face, define the 3D vectors for the face corners
  // Face order: px(+X), nx(-X), py(+Y), ny(-Y), pz(+Z), nz(-Z)
  const faces = [
    { name: 'px', fn: (u, v) => [1, v, -u] },    // +X: right
    { name: 'nx', fn: (u, v) => [-1, v, u] },     // -X: left
    { name: 'py', fn: (u, v) => [u, 1, -v] },     // +Y: top
    { name: 'ny', fn: (u, v) => [u, -1, v] },      // -Y: bottom
    { name: 'pz', fn: (u, v) => [u, v, 1] },       // +Z: front
    { name: 'nz', fn: (u, v) => [-u, v, -1] },     // -Z: back
  ];

  for (const face of faces) {
    const faceData = Buffer.alloc(faceSize * faceSize * 3);

    for (let row = 0; row < faceSize; row++) {
      for (let col = 0; col < faceSize; col++) {
        // Map pixel to [-1, 1] range
        const u = (2 * col / faceSize) - 1;
        const v = -(2 * row / faceSize) + 1; // flip Y

        const [x, y, z] = face.fn(u, v);
        const [r, g, b] = samplePanorama(x, y, z);

        const idx = (row * faceSize + col) * 3;
        faceData[idx] = r;
        faceData[idx + 1] = g;
        faceData[idx + 2] = b;
      }
    }

    const outFile = path.join(outputDir, face.name + '.jpg');
    await sharp(faceData, { raw: { width: faceSize, height: faceSize, channels: 3 } })
      .jpeg({ quality: 90 })
      .toFile(outFile);
    console.log(`Created ${face.name}.jpg`);
  }
}

async function main() {
  console.log('Converting forest skybox...');
  await equirectToCubemap(
    path.join(root, 'public/free_-_skybox_fairy_forest_day/textures/Scene_-_Root_diffuse.jpeg'),
    path.join(root, 'public/skybox-faces/forest'),
    512
  );
  console.log('Converting mountain skybox...');
  await equirectToCubemap(
    path.join(root, 'public/mountain_skybox/textures/Material.001_baseColor.png'),
    path.join(root, 'public/skybox-faces/mountain'),
    512
  );
  console.log('All done!');
}

main().catch(console.error);
