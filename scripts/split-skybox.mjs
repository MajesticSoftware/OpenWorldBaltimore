import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

async function splitPanorama(inputPath, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const meta = await sharp(inputPath).metadata();
  const w = meta.width;
  const h = meta.height;
  const size = h; // use height as square face size
  const faces = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
  for (let i = 0; i < 6; i++) {
    const left = Math.min(Math.floor((w - size) * (i / 5)), w - size);
    const outFile = path.join(outputDir, faces[i] + '.jpg');
    await sharp(inputPath)
      .extract({ left, top: 0, width: size, height: size })
      .resize(512, 512)
      .jpeg({ quality: 90 })
      .toFile(outFile);
    console.log(`Created ${outFile}`);
  }
}

async function main() {
  await splitPanorama(
    path.join(root, 'public/free_-_skybox_fairy_forest_day/textures/Scene_-_Root_diffuse.jpeg'),
    path.join(root, 'public/skybox-faces/forest')
  );
  await splitPanorama(
    path.join(root, 'public/mountain_skybox/textures/Material.001_baseColor.png'),
    path.join(root, 'public/skybox-faces/mountain')
  );
  console.log('All done!');
}

main().catch(console.error);
