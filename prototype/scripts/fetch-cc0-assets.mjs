import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const outputDir = join(process.cwd(), 'public', 'assets', 'cc0');
const gobkitManifestUrl = 'https://gobkit.com/api/free';
const polyHavenApi = 'https://api.polyhaven.com';
const userAgent = 'TSI-Android-Asset-Pipeline/1.0 (CC0 game asset bundler)';
const toMiB = (bytes) => (bytes / 1024 / 1024).toFixed(2);
const safeFileName = (name) => name.replace(/[^a-z0-9._-]+/gi, '_');

async function getJson(url) {
  const response = await fetch(url, { headers: { 'user-agent': userAgent } });
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  return response.json();
}

async function download(url, destination, allowedHosts) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !allowedHosts.has(parsed.hostname)) {
    throw new Error(`Rejected external asset URL: ${url}`);
  }
  const response = await fetch(parsed, { headers: { 'user-agent': userAgent } });
  if (!response.ok) throw new Error(`Asset download failed (${response.status}): ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1024) throw new Error(`Asset is unexpectedly small: ${url}`);
  await writeFile(destination, bytes);
  return bytes.length;
}

// Character and environment models from Gobkit's free CC0 catalogue.
const gobkit = await getJson(gobkitManifestUrl);
if (!Array.isArray(gobkit.packs)) throw new Error('Gobkit manifest packs[] missing');
const packIds = new Set(['gobkit-human004-pack', 'gobkit-human012-pack', 'gobkit-human007-pack']);
const packs = gobkit.packs.filter((pack) =>
  packIds.has(pack.id) || pack.kind === 'environment' || /environment|nature|prop/i.test(pack.id ?? '')
);
const models = packs.flatMap((pack) => {
  const license = String(pack.license ?? '');
  if (!/CC0 1\.0/i.test(license)) throw new Error(`Refusing non-CC0 pack: ${pack.id} (${license})`);
  return (pack.models ?? []).map((model) => ({
    id: model.id, name: model.name, pack: pack.name, url: model.url,
    rigged: Boolean(model.rigged),
    animations: (model.animations ?? []).map((animation) => animation.name),
    license
  }));
});
if (!models.some((model) => model.id === 'armysniper') || models.length < 12) {
  throw new Error('Gobkit CC0 character selection is incomplete');
}

await mkdir(outputDir, { recursive: true });
const downloadedModels = [];
for (const model of models) {
  const fileName = basename(new URL(model.url).pathname);
  const bytes = await download(model.url, join(outputDir, fileName), new Set(['gobkit.com']));
  downloadedModels.push({ ...model, file: `/assets/cc0/${fileName}`, bytes });
  console.log(`Gobkit model ${model.name}: ${toMiB(bytes)} MiB`);
}

// Poly Haven assets are CC0. Select tactical terrain/surface materials at 4K,
// then 2K as a fallback. The file API supplies authoritative download URLs and hashes.
const polyHeaders = { 'user-agent': userAgent };
const [textureCatalogue, hdriCatalogue] = await Promise.all([
  getJson(`${polyHavenApi}/assets?type=textures`),
  getJson(`${polyHavenApi}/assets?type=hdris`)
]);
const materialPattern = /concrete|asphalt|road|gravel|dirt|soil|sand|rock|stone|metal|rust|brick|mud|ground|military|urban/i;
const textureCandidates = Object.entries(textureCatalogue)
  .filter(([id, asset]) => materialPattern.test(`${id} ${asset.name ?? ''} ${asset.description ?? ''} ${(asset.tags ?? []).join(' ')}`))
  .sort((a, b) => (b[1].download_count ?? 0) - (a[1].download_count ?? 0))
  .slice(0, 12);

if (textureCandidates.length < 5) throw new Error('Poly Haven returned too few suitable CC0 terrain textures');

function flattenFiles(node, path = []) {
  if (!node || typeof node !== 'object') return [];
  if (typeof node.url === 'string' && Number.isFinite(node.size)) return [{ ...node, path }];
  return Object.entries(node).flatMap(([key, value]) => flattenFiles(value, [...path, key]));
}

const downloadedTextures = [];
for (const [id, metadata] of textureCandidates) {
  const fileTree = await getJson(`${polyHavenApi}/files/${encodeURIComponent(id)}`);
  const files = flattenFiles(fileTree);
  const resolution = files.some((file) => file.path.includes('4k')) ? '4k' : '2k';
  const maps = files.filter((file) =>
    file.path.includes(resolution) &&
    /\.(jpg|jpeg|png)$/i.test(new URL(file.url).pathname) &&
    /diff|albedo|color|rough|normal|bump|ao|ambient|metal|disp/i.test(file.path.join(' '))
  );
  const unique = [...new Map(maps.map((file) => [file.url, file])).values()].slice(0, 8);
  if (!unique.length) {
    console.log(`Skipped ${metadata.name}: no supported ${resolution} image maps`);
    continue;
  }
  const materialFiles = [];
  for (const file of unique) {
    const mapName = file.path.at(-1);
    const fileName = `polyhaven_${safeFileName(id)}_${safeFileName(file.path.join('_'))}.${new URL(file.url).pathname.split('.').at(-1)}`;
    const bytes = await download(file.url, join(outputDir, fileName), new Set(['dl.polyhaven.org']));
    materialFiles.push({ map: mapName, file: `/assets/cc0/${fileName}`, bytes, md5: file.md5 });
  }
  downloadedTextures.push({
    id, name: metadata.name, resolution, license: 'CC0 1.0',
    source: `${polyHavenApi}/files/${id}`, files: materialFiles
  });
  console.log(`Poly Haven texture ${metadata.name}: ${toMiB(materialFiles.reduce((n, f) => n + f.bytes, 0))} MiB (${resolution})`);
}

// Bundle two practical outdoor lighting environments at 2K. Prefer HDR, which is
// directly useful as lighting input and avoids enormous EXR/HDR downloads.
const hdriCandidates = Object.entries(hdriCatalogue)
  .filter(([id, asset]) => /outdoor|overcast|cloudy|sun|sky|industrial|urban|street|field/i.test(`${id} ${asset.name ?? ''} ${(asset.tags ?? []).join(' ')}`))
  .sort((a, b) => (b[1].download_count ?? 0) - (a[1].download_count ?? 0))
  .slice(0, 2);
const downloadedHdris = [];
for (const [id, metadata] of hdriCandidates) {
  const fileTree = await getJson(`${polyHavenApi}/files/${encodeURIComponent(id)}`);
  const files = flattenFiles(fileTree);
  const candidate = files.find((file) =>
    file.path.includes('2k') && file.path.some((part) => part.toLowerCase() === 'hdr') &&
    new URL(file.url).pathname.endsWith('.hdr')
  );
  if (!candidate) continue;
  const fileName = `polyhaven_hdri_${safeFileName(id)}_2k.hdr`;
  const bytes = await download(candidate.url, join(outputDir, fileName), new Set(['dl.polyhaven.org']));
  downloadedHdris.push({ id, name: metadata.name, file: `/assets/cc0/${fileName}`, bytes, license: 'CC0 1.0' });
  console.log(`Poly Haven HDRI ${metadata.name}: ${toMiB(bytes)} MiB`);
}

const manifest = {
  generatedAt: new Date().toISOString(),
  license: 'CC0 1.0',
  credits: ['Gobkit free CC0 3D assets', 'Poly Haven CC0 assets — Powered by Poly Haven'],
  models: downloadedModels,
  textures: downloadedTextures,
  hdris: downloadedHdris
};
await writeFile(join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
const modelBytes = downloadedModels.reduce((sum, item) => sum + item.bytes, 0);
const textureBytes = downloadedTextures.reduce((sum, item) => sum + item.files.reduce((n, file) => n + file.bytes, 0), 0);
const hdriBytes = downloadedHdris.reduce((sum, item) => sum + item.bytes, 0);
const totalBytes = modelBytes + textureBytes + hdriBytes;
console.log(`Total bundled CC0 content: ${toMiB(totalBytes)} MiB (${downloadedModels.length} models, ${downloadedTextures.length} material sets, ${downloadedHdris.length} HDRIs)`);
console.log('APK target: >=100 MiB; the Android workflow checks the actual packaged APK size.');
