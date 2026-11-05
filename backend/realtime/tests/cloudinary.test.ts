import assert from 'node:assert/strict';
import test from 'node:test';
import { v2 as cloudinary } from 'cloudinary';
import {
  cloudinaryPlayerAvatarPrefix,
  isAllowedAvatarContent,
  createAvatarUploadSignature,
  readCloudinaryConfig,
  TSI_AVATAR_ALLOWED_FORMATS,
  TSI_AVATAR_MAX_BYTES
} from '../src/cloudinary.js';

const validEnv = {
  CLOUDINARY_CLOUD_NAME: 'tsi-demo',
  CLOUDINARY_API_KEY: '123456789012345',
  CLOUDINARY_API_SECRET: 'test-secret-value',
  CLOUDINARY_UPLOAD_PRESET: 'tsi_player_avatar_signed'
};

test('Cloudinary is optional when no credentials are configured', () => {
  assert.equal(readCloudinaryConfig({}), null);
});

test('Cloudinary rejects partially configured credentials', () => {
  assert.throws(() => readCloudinaryConfig({ CLOUDINARY_CLOUD_NAME: 'tsi-demo' } as NodeJS.ProcessEnv), /configuration is incomplete/i);
});

test('Firebase UID is encoded safely in the Cloudinary namespace', () => {
  assert.equal(
    cloudinaryPlayerAvatarPrefix('firebase:provider|opaque/id'),
    'tsi/players/ZmlyZWJhc2U6cHJvdmlkZXJ8b3BhcXVlL2lk/avatars/'
  );
  assert.throws(() => cloudinaryPlayerAvatarPrefix(''), /UID is invalid/i);
  assert.throws(() => cloudinaryPlayerAvatarPrefix('x'.repeat(129)), /UID is invalid/i);
});

test('Cloudinary signature is bound to a unique player avatar path', () => {
  const config = readCloudinaryConfig(validEnv as NodeJS.ProcessEnv);
  assert.ok(config);
  const signed = createAvatarUploadSignature(config, 'firebase_uid_123', 1_800_000_000_000, '12345678-abcd');
  assert.equal(signed.cloudName, 'tsi-demo');
  assert.equal(signed.apiKey, '123456789012345');
  assert.equal(signed.resourceType, 'image');
  assert.equal(signed.timestamp, 1_800_000_000);
  assert.equal(signed.uploadPreset, 'tsi_player_avatar_signed');
  assert.equal(signed.overwrite, false);
  assert.equal(signed.publicId, cloudinaryPlayerAvatarPrefix('firebase_uid_123') + 'avatar-12345678-abcd');
  assert.equal(signed.uploadUrl, 'https://api.cloudinary.com/v1_1/tsi-demo/image/upload');
  const expected = cloudinary.utils.api_sign_request({
    overwrite: false, public_id: signed.publicId, timestamp: signed.timestamp, upload_preset: signed.uploadPreset
  }, config.apiSecret);
  assert.equal(signed.signature, expected);
  assert.ok(!JSON.stringify(signed).includes(config.apiSecret));
});

test('avatar policy accepts only small raster images', () => {
  assert.deepEqual(TSI_AVATAR_ALLOWED_FORMATS, ['jpg', 'jpeg', 'png', 'webp']);
  assert.equal(TSI_AVATAR_MAX_BYTES, 5 * 1024 * 1024);
});

test('avatar signing rejects invalid nonces', () => {
  const config = readCloudinaryConfig(validEnv as NodeJS.ProcessEnv);
  assert.ok(config);
  assert.throws(() => createAvatarUploadSignature(config, 'valid-uid', 1_800_000_000_000, 'bad'), /nonce is invalid/i);
});

test('avatar binary validation rejects MIME spoofing and accepts supported signatures', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const webp = Buffer.from('RIFF0000WEBP', 'ascii');
  assert.equal(isAllowedAvatarContent('image/jpeg', jpeg), true);
  assert.equal(isAllowedAvatarContent('image/png', png), true);
  assert.equal(isAllowedAvatarContent('image/webp', webp), true);
  assert.equal(isAllowedAvatarContent('image/png', jpeg), false);
  assert.equal(isAllowedAvatarContent('image/gif', Buffer.from('GIF89a')), false);
  assert.equal(isAllowedAvatarContent('image/webp', Buffer.from('RIFFxxxxNOPE')), false);
});
