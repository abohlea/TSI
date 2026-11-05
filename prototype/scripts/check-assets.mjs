import { readdir, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public/assets/', import.meta.url));
const allowed = new Set(['.glb', '.gltf', '.bin', '.png', '.jpg', '.jpeg', '.webp', '.ktx2', '.ogg', '.mp3', '.wav']);
const maxFileSize = 25 * 1024 * 1024;

async function scan(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const result = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await scan(path));
    if (entry.isFile()) result.push(path);
  }
  return result;
}

const files = await scan(root);
let total = 0;
const errors = [];
for (const file of files) {
  const info = await stat(file);
  total += info.size;
  const extension = extname(file).toLowerCase();
  if (!allowed.has(extension)) errors.push(`${file}: extension non prise en charge`);
  if (info.size === 0) errors.push(`${file}: fichier vide`);
  if (info.size > maxFileSize) errors.push(`${file}: dépasse 25 MiB`);
}
console.log(`[assets] ${files.length} fichier(s), ${(total / 1048576).toFixed(2)} MiB`);
if (files.length === 0) console.warn('[assets] Aucun asset réel installé; les formes provisoires restent actives.');
if (total > 120 * 1048576) console.warn('[assets] Bundle supérieur à 120 MiB: optimiser pour Android.');
for (const error of errors) console.error(error);
if (errors.length) process.exitCode = 1;
