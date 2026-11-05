import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';

export interface CloudinaryRuntimeConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadPreset: string;
}

export interface CloudinaryAvatarSignature {
  cloudName: string;
  apiKey: string;
  uploadUrl: string;
  resourceType: 'image';
  timestamp: number;
  publicId: string;
  uploadPreset: string;
  overwrite: false;
  signature: string;
}

const CONFIG_KEYS = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'CLOUDINARY_UPLOAD_PRESET'
] as const;

export function readCloudinaryConfig(env: NodeJS.ProcessEnv = process.env): CloudinaryRuntimeConfig | null {
  const values = CONFIG_KEYS.map((key) => env[key]?.trim() ?? '');
  if (values.every((value) => value.length === 0)) return null;
  const missing = CONFIG_KEYS.filter((key) => !env[key]?.trim());
  if (missing.length > 0) throw new Error('Cloudinary configuration is incomplete. Missing: ' + missing.join(', '));
  const [cloudName, apiKey, apiSecret, uploadPreset] = values as [string, string, string, string];
  if (!/^[a-zA-Z0-9_-]{2,128}$/.test(cloudName)) throw new Error('CLOUDINARY_CLOUD_NAME contains invalid characters.');
  if (!/^[a-zA-Z0-9_-]{2,128}$/.test(apiKey)) throw new Error('CLOUDINARY_API_KEY contains invalid characters.');
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(uploadPreset)) throw new Error('CLOUDINARY_UPLOAD_PRESET contains invalid characters.');
  return { cloudName, apiKey, apiSecret, uploadPreset };
}

export function cloudinaryPlayerAvatarPrefix(uid: string): string {
  if (!uid || Buffer.byteLength(uid, 'utf8') > 128) throw new Error('Firebase UID is invalid.');
  const safeUid = Buffer.from(uid, 'utf8').toString('base64url');
  return 'tsi/players/' + safeUid + '/avatars/';
}

export function configureCloudinary(config: CloudinaryRuntimeConfig): void {
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true
  });
}

export function createAvatarUploadSignature(
  config: CloudinaryRuntimeConfig,
  uid: string,
  nowMs = Date.now(),
  nonce = randomUUID()
): CloudinaryAvatarSignature {
  const ownerPrefix = cloudinaryPlayerAvatarPrefix(uid);
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(nonce)) throw new Error('Upload nonce is invalid.');
  const timestamp = Math.floor(nowMs / 1000);
  const publicId = ownerPrefix + 'avatar-' + nonce;
  const signedParams = { overwrite: false, public_id: publicId, timestamp, upload_preset: config.uploadPreset };
  const signature = cloudinary.utils.api_sign_request(signedParams, config.apiSecret);
  return {
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    uploadUrl: 'https://api.cloudinary.com/v1_1/' + config.cloudName + '/image/upload',
    resourceType: 'image',
    timestamp,
    publicId,
    uploadPreset: config.uploadPreset,
    overwrite: false,
    signature
  };
}

export const TSI_AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const TSI_AVATAR_ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'] as const;

export function isAllowedAvatarContent(contentType: string, data: Buffer): boolean {
  if (contentType === 'image/jpeg') return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (contentType === 'image/png') {
    return data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (contentType === 'image/webp') {
    return data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP';
  }
  return false;
}
