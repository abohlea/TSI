import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { v2 as cloudinary } from 'cloudinary';
import { getFirebaseAdminApp, verifyFirebasePlayerToken } from './firebaseAuth.js';
import {
  cloudinaryPlayerAvatarPrefix,
  configureCloudinary,
  readCloudinaryConfig,
  TSI_AVATAR_ALLOWED_FORMATS,
  TSI_AVATAR_MAX_BYTES
} from './cloudinary.js';

const UPLOAD_PATH = '/v1/media/avatar/upload';
const WINDOW_MS = 60_000;
const MAX_SIGNATURES = 8;
const MAX_PLAYERS = 20_000;

interface RateEntry { startedAt: number; count: number; }
interface CloudinaryResource {
  asset_id?: unknown; public_id?: unknown; secure_url?: unknown; resource_type?: unknown;
  format?: unknown; width?: unknown; height?: unknown; bytes?: unknown;
}

function json(response: ServerResponse, status: number, body: Record<string, unknown>): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(JSON.stringify(body));
}

async function readAvatarBytes(request: IncomingMessage): Promise<Buffer> {
  const contentType = request.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType ?? '')) throw new Error('Unsupported avatar content type.');
  const declaredLength = Number(request.headers['content-length'] ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > TSI_AVATAR_MAX_BYTES) throw new Error('Avatar exceeds the 5 MiB limit.');
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += bytes.length;
    if (total > TSI_AVATAR_MAX_BYTES) throw new Error('Avatar exceeds the 5 MiB limit.');
    chunks.push(bytes);
  }
  if (total < 1) throw new Error('Avatar is empty.');
  const data = Buffer.concat(chunks, total);
  const isJpeg = data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  const isPng = data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isWebp = data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP';
  if ((contentType === 'image/jpeg' && !isJpeg) || (contentType === 'image/png' && !isPng) || (contentType === 'image/webp' && !isWebp)) {
    throw new Error('Avatar content does not match its declared image type.');
  }
  return data;
}

function bearer(request: IncomingMessage): string | null {
  const value = request.headers.authorization;
  if (typeof value !== 'string') return null;
  return /^Bearer ([A-Za-z0-9._~-]{100,12000})$/.exec(value)?.[1] ?? null;
}

function createRateLimiter() {
  const entries = new Map<string, RateEntry>();
  return (uid: string, now = Date.now()): boolean => {
    const previous = entries.get(uid);
    if (previous && now - previous.startedAt < WINDOW_MS) {
      if (previous.count >= MAX_SIGNATURES) return false;
      previous.count += 1;
      return true;
    }
    if (!previous && entries.size >= MAX_PLAYERS) {
      for (const [key, entry] of entries) {
        if (now - entry.startedAt >= WINDOW_MS) entries.delete(key);
      }
      if (entries.size >= MAX_PLAYERS) return false;
    }
    entries.set(uid, { startedAt: now, count: 1 });
    return true;
  };
}

async function authenticate(request: IncomingMessage): Promise<string | null> {
  const token = bearer(request);
  if (!token) return null;
  const identity = await verifyFirebasePlayerToken(token);
  const db = getFirestore(getFirebaseAdminApp());
  const account = await db.doc('users/' + identity.playerId).get();
  if (!account.exists || account.get('accountStatus') !== 'active') {
    throw new Error('TSI account is not active.');
  }
  return identity.playerId;
}

function validateResource(
  resource: CloudinaryResource,
  uid: string,
  cloudName: string,
  expectedPublicId: string,
  expectedAssetId: string
) {
  const assetId = typeof resource.asset_id === 'string' ? resource.asset_id : '';
  const publicId = typeof resource.public_id === 'string' ? resource.public_id : '';
  const secureUrl = typeof resource.secure_url === 'string' ? resource.secure_url : '';
  const format = typeof resource.format === 'string' ? resource.format.toLowerCase() : '';
  const width = typeof resource.width === 'number' ? resource.width : 0;
  const height = typeof resource.height === 'number' ? resource.height : 0;
  const bytes = typeof resource.bytes === 'number' ? resource.bytes : 0;
  const ownerPrefix = cloudinaryPlayerAvatarPrefix(uid);
  if (
    assetId !== expectedAssetId || publicId !== expectedPublicId || !publicId.startsWith(ownerPrefix) ||
    resource.resource_type !== 'image' ||
    !secureUrl.startsWith('https://res.cloudinary.com/' + cloudName + '/image/upload/') ||
    !(TSI_AVATAR_ALLOWED_FORMATS as readonly string[]).includes(format) ||
    !Number.isInteger(width) || width < 1 || width > 4096 ||
    !Number.isInteger(height) || height < 1 || height > 4096 ||
    !Number.isInteger(bytes) || bytes < 1 || bytes > TSI_AVATAR_MAX_BYTES
  ) return null;
  return { assetId, publicId, secureUrl, format, width, height, bytes };
}

export async function startCloudinaryMediaApi(): Promise<void> {
  const config = readCloudinaryConfig();
  if (!config) {
    console.log('[TSI Media API] Disabled: Cloudinary environment variables are not configured.');
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    console.warn('[TSI Media API] Disabled in production until a hardened public deployment is implemented.');
    return;
  }

  const port = Number.parseInt(process.env.TSI_MEDIA_API_PORT ?? '2568', 10);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('TSI_MEDIA_API_PORT must be between 1024 and 65535.');
  const origins = new Set((process.env.TSI_MEDIA_ALLOWED_ORIGINS ??
    process.env.TSI_ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',').map((value) => value.trim()).filter(Boolean));
  configureCloudinary(config);
  const allowSignature = createRateLimiter();

  const api = createServer(async (request, response) => {
    const origin = request.headers.origin;
    if (origin && !origins.has(origin)) { json(response, 403, { error: 'Origin is not allowed.' }); return; }
    if (origin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
    }
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }

    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    if (request.method !== 'POST' || path !== UPLOAD_PATH) {
      json(response, 404, { error: 'Route not found.' }); return;
    }

    try {
      const uid = await authenticate(request);
      if (!uid) { json(response, 401, { error: 'A valid Firebase bearer token is required.' }); return; }
      if (path === UPLOAD_PATH) {
        if (!allowSignature(uid)) { json(response, 429, { error: 'Avatar upload rate limit reached.' }); return; }
        const bytes = await readAvatarBytes(request);
        const publicId = cloudinaryPlayerAvatarPrefix(uid) + 'avatar-' + randomUUID();
        const uploaded = await new Promise<CloudinaryResource>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({
            resource_type: 'image', type: 'upload', public_id: publicId, overwrite: false,
            upload_preset: config.uploadPreset, max_bytes: TSI_AVATAR_MAX_BYTES
          }, (error, result) => {
            if (error || !result) reject(error ?? new Error('Cloudinary returned no upload result.'));
            else resolve(result as CloudinaryResource);
          });
          Readable.from([bytes]).pipe(stream);
        });
        const assetId = typeof uploaded.asset_id === 'string' ? uploaded.asset_id : '';
        const avatar = validateResource(uploaded, uid, config.cloudName, publicId, assetId);
        if (!avatar) throw new Error('Cloudinary asset failed TSI avatar validation.');
        const db = getFirestore(getFirebaseAdminApp());
        await db.doc('playerProfiles/' + uid).set({ avatar, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        json(response, 200, { avatar });
        return;
      }

    } catch (error) {
      if (error instanceof Error && error.message === 'Avatar exceeds the 5 MiB limit.') {
        json(response, 413, { error: error.message }); return;
      }
      if (error instanceof Error && (error.message === 'Unsupported avatar content type.' || error.message === 'Avatar content does not match its declared image type.' || error.message === 'Avatar is empty.')) {
        json(response, 415, { error: error.message }); return;
      }
      if (error instanceof Error && error.message === 'TSI account is not active.') {
        json(response, 403, { error: error.message }); return;
      }
      console.error('[TSI Media API] Request failed:', error);
      json(response, 500, { error: 'Media request could not be completed.' });
    }
  });

  await new Promise<void>((resolve, reject) => {
    api.once('error', reject);
    api.listen(port, '127.0.0.1', resolve);
  });
  console.log('[TSI Media API] Local signed-upload API listening at http://127.0.0.1:' + port);
}
