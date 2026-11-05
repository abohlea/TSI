import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const manifestUrl = 'https://gobkit.com/api/free';
const outputDir = join(process.cwd(), 'public', 'assets', 'cc0');
const allowedHost = 'gobkit.com';
const selectedPackIds = new Set([
  'gobkit-human004-pack',
  'gobkit-human012-pack',
  'gobkit-human007-pack'
]);
const selectedEnvironmentPack = (pack) =>
  pack.kind === 'environment' || /environment|nature|prop/i.test(pack.id ?? '');

const response = await fetch(manifestUrl, { headers: { 'user-agent': 'TSI-asset-pipeline/1.0' } });
if (!response.ok) throw new Error(`Gobkit manifest failed: HTTP ${response.status}`);
const manifest = await response.json();
if (!Array.isArray(manifest.packs)) throw new Error('Unexpected Gobkit manifest: packs[] missing');

const selected = manifest.packs.filter((pack) =>
  selectedPackIds.has(pack.id) || selectedEnvironmentPack(pack)
);
const assets = selected.flatMap((pack) => {
  const license = String(pack.license ?? '');
  if (!/CC0 1\.0/i.test(license)) {
    throw new Error(`Refusing non-CC0 pack: ${pack.id} (${license})`);
  }
  return (pack.models ?? []).map((model) => ({
    id: model.id,
    name: model.name,
    pack: pack.name,
    url: model.url,
    rigged: Boolean(model.rigged),
    animations: (model.animations ?? []).map((animation) => animation.name),
    license
  }));
});

if (!assets.some((asset) => asset.id === 'armysniper')) {
  throw new Error('Expected CC0 ArmySniper asset was not found in the current manifest');
}
if (assets.length < 12) throw new Error(`Asset selection unexpectedly small: ${assets.length}`);

await mkdir(outputDir, { recursive: true });
const downloaded = [];
for (const asset of assets) {
  const url = new URL(asset.url);
  if (url.protocol !== 'https:' || url.hostname !== allowedHost || !url.pathname.endsWith('.glb')) {
    throw new Error(`Rejected asset URL: ${asset.url}`);
  }
  const fileName = basename(url.pathname);
  const destination = join(outputDir, fileName);
  const fileResponse = await fetch(url);
  if (!fileResponse.ok) throw new Error(`Download failed for ${asset.name}: HTTP ${fileResponse.status}`);
  const bytes = Buffer.from(await fileResponse.arrayBuffer());
  if (bytes.length < 1024) throw new Error(`Asset too small or invalid: ${asset.name}`);
  await writeFile(destination, bytes);
  downloaded.push({ ...asset, file: `/assets/cc0/${fileName}`, bytes: bytes.length });
  console.log(`Downloaded ${asset.name}: ${(bytes.length / 1024 / 1024).toFixed(2)} MiB`);
}

await writeFile(
  join(outputDir, 'manifest.json'),
  JSON.stringify({
    source: 'Gobkit free 3D assets',
    sourceManifest: manifestUrl,
    license: 'CC0 1.0',
    generatedAt: new Date().toISOString(),
    models: downloaded
  }, null, 2)
);
const totalBytes = downloaded.reduce((sum, asset) => sum + asset.bytes, 0);
console.log(`Downloaded ${downloaded.length} CC0 models; total ${(totalBytes / 1024 / 1024).toFixed(2)} MiB`);
