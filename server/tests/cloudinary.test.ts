import assert from "node:assert/strict";
import test from "node:test";
import { v2 as cloudinary } from "cloudinary";
import {
  createAvatarUploadSignature,
  readCloudinaryConfig,
  TSI_AVATAR_ALLOWED_FORMATS,
  TSI_AVATAR_MAX_BYTES
} from "../src/media/cloudinary.js";

const validEnv = {
  CLOUDINARY_CLOUD_NAME: "tsi-demo",
  CLOUDINARY_API_KEY: "123456789012345",
  CLOUDINARY_API_SECRET: "test-secret-value",
  CLOUDINARY_UPLOAD_PRESET: "tsi_player_avatar_signed"
};

test("Cloudinary remains optional when no credentials are configured", () => {
  assert.equal(readCloudinaryConfig({}), null);
});

test("Cloudinary rejects partially configured credentials", () => {
  assert.throws(
    () => readCloudinaryConfig({ CLOUDINARY_CLOUD_NAME: "tsi-demo" } as NodeJS.ProcessEnv),
    /configuration is incomplete/i
  );
});

test("Cloudinary signing binds the upload to a player-specific avatar path", () => {
  const config = readCloudinaryConfig(validEnv as NodeJS.ProcessEnv);
  assert.ok(config);

  const signed = createAvatarUploadSignature(config, "firebase_uid_123", 1_800_000_000_000, "12345678-abcd");

  assert.equal(signed.cloudName, "tsi-demo");
  assert.equal(signed.apiKey, "123456789012345");
  assert.equal(signed.resourceType, "image");
  assert.equal(signed.timestamp, 1_800_000_000);
  assert.equal(signed.uploadPreset, "tsi_player_avatar_signed");
  assert.equal(signed.overwrite, false);
  assert.match(signed.publicId, /^tsi\/players\/firebase_uid_123\/avatars\/avatar-12345678-abcd$/);
  assert.equal(signed.uploadUrl, "https://api.cloudinary.com/v1_1/tsi-demo/image/upload");

  const expected = cloudinary.utils.api_sign_request({
    overwrite: false,
    public_id: signed.publicId,
    timestamp: signed.timestamp,
    upload_preset: signed.uploadPreset
  }, config.apiSecret);
  assert.equal(signed.signature, expected);
  assert.ok(!JSON.stringify(signed).includes(config.apiSecret));
});

test("avatar policy is deliberately limited to small raster images", () => {
  assert.deepEqual(TSI_AVATAR_ALLOWED_FORMATS, ["jpg", "jpeg", "png", "webp"]);
  assert.equal(TSI_AVATAR_MAX_BYTES, 5 * 1024 * 1024);
});

test("avatar signature rejects invalid player identifiers", () => {
  const config = readCloudinaryConfig(validEnv as NodeJS.ProcessEnv);
  assert.ok(config);
  assert.throws(
    () => createAvatarUploadSignature(config, "../other-player", 1_800_000_000_000, "12345678"),
    /UID is invalid/i
  );
});
