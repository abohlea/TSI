import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { v2 as cloudinary } from 'cloudinary';
import { getFirebaseAdminApp, verifyFirebasePlayerToken } from './firebaseAuth.js';
import {
  cloudinaryPlayerAvatarPrefix,
  configureCloudinary,
  createAvatarUploadSignature,
  readCloudinaryConfig,
  TSI_AVATAR_ALLOWED_FORMATS,
  TSI_AVATAR_MAX_BYTES
} from './cloudinary.js';

const SIGNATURE_PATH = '/v1/media/avatar/signature';
const CONFIRM_PATH = '/v1/media/avatar/confirm';
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

async function readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = '';
  for await (const chunk of request) {
    raw += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    if (Buffer.byteLength(raw, 'utf8') > 4096) throw new Error('Request body is too large.');
  }
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('Invalid JSON object.');
  return parsed as Record<string, unknown>;
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
    if (request.method !== 'POST' || (path !== SIGNATURE_PATH && path !== CONFIRM_PATH)) {
      json(response, 404, { error: 'Route not found.' }); return;
    }

    try {
      const uid = await authenticate(request);
      if (!uid) { json(response, 401, { error: 'A valid Firebase bearer token is required.' }); return; }
      const body = await readBody(request);

      if (path === SIGNATURE_PATH) {
        if (body.purpose !== undefined && body.purpose !== 'avatar') {
          json(response, 400, { error: 'Only avatar uploads are enabled.' }); return;
        }
        if (!allowSignature(uid)) { json(response, 429, { error: 'Avatar signing rate limit reached.' }); return; }
        json(response, 200, createAvatarUploadSignature(config, uid) as unknown as Record<string, unknown>);
        return;
      }

      const publicId = typeof body.publicId === 'string' ? body.publicId : '';
      const assetId = typeof body.assetId === 'string' ? body.assetId : '';
      if (!publicId || publicId.length > 255 || !assetId || assetId.length > 128) {
        json(response, 400, { error: 'publicId and assetId are required.' }); return;
      }
      if (!publicId.startsWith(cloudinaryPlayerAvatarPrefix(uid))) {
        json(response, 403, { error: 'This asset does not belong to the authenticated player.' }); return;
      }

      const resource = await cloudinary.api.resource(publicId, { resource_type: 'image', type: 'upload' }) as CloudinaryResource;
      const avatar = validateResource(resource, uid, config.cloudName, publicId, assetId);
      if (!avatar) {
        if (resource.asset_id === assetId && resource.public_id === publicId && resource.resource_type === 'image') {
          await cloudinary.uploader.destroy(publicId, { resource_type: 'image', type: 'upload', invalidate: true })
            .catch((error: unknown) => console.warn('[TSI Media API] Invalid avatar cleanup failed:', error));
        }
        json(response, 422, { error: 'Cloudinary asset failed TSI avatar validation.' }); return;
      }

      const db = getFirestore(getFirebaseAdminApp());
      await db.doc('playerProfiles/' + uid).set({
        avatar,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      json(response, 200, { avatar });
    } catch (error) {
      if (error instanceof SyntaxError || (error instanceof Error && error.message === 'Invalid JSON object.')) {
        json(response, 400, { error: 'Invalid JSON request body.' }); return;
      }
      if (error instanceof Error && error.message === 'Request body is too large.') {
        json(response, 413, { error: 'Request body is too large.' }); return;
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
