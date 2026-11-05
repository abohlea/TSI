import type { FirebaseGameIdentity } from "../firebase/firebaseAuth";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

interface SignedAvatarUpload {
  cloudName: string;
  apiKey: string;
  uploadUrl: string;
  resourceType: "image";
  timestamp: number;
  publicId: string;
  uploadPreset: string;
  overwrite: false;
  signature: string;
}

export interface PlayerAvatarAsset {
  assetId: string;
  publicId: string;
  secureUrl: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

function mediaApiUrl(): string {
  const value = import.meta.env.VITE_TSI_MEDIA_API_URL?.trim();
  if (!value) {
    throw new Error("Configuration manquante : VITE_TSI_MEDIA_API_URL.");
  }
  return value.replace(/\/$/, "");
}

async function readJson<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null &&
      "error" in payload && typeof payload.error === "string"
      ? payload.error
      : `Erreur média HTTP ${response.status}.`;
    throw new Error(message);
  }
  return payload as T;
}

async function requestSignature(idToken: string): Promise<SignedAvatarUpload> {
  const response = await fetch(`${mediaApiUrl()}/v1/media/avatar/signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ purpose: "avatar" })
  });
  return readJson<SignedAvatarUpload>(response);
}

async function confirmAvatar(
  idToken: string,
  publicId: string,
  assetId: string
): Promise<PlayerAvatarAsset> {
  const response = await fetch(`${mediaApiUrl()}/v1/media/avatar/confirm`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ publicId, assetId })
  });
  const payload = await readJson<{ avatar: PlayerAvatarAsset }>(response);
  return payload.avatar;
}

export async function uploadPlayerAvatar(
  file: File,
  identity: Pick<FirebaseGameIdentity, "idToken">
): Promise<PlayerAvatarAsset> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Avatar : seuls les formats JPG, PNG et WebP sont acceptés.");
  }
  if (file.size < 1 || file.size > MAX_AVATAR_BYTES) {
    throw new Error("Avatar : la taille doit être comprise entre 1 octet et 5 Mio.");
  }

  const signed = await requestSignature(identity.idToken);
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signed.apiKey);
  form.append("timestamp", String(signed.timestamp));
  form.append("public_id", signed.publicId);
  form.append("upload_preset", signed.uploadPreset);
  form.append("overwrite", String(signed.overwrite));
  form.append("signature", signed.signature);

  const uploadResponse = await fetch(signed.uploadUrl, {
    method: "POST",
    body: form
  });
  const uploaded = await readJson<{
    asset_id?: string;
    public_id?: string;
  }>(uploadResponse);

  if (
    uploaded.asset_id !== undefined &&
    uploaded.public_id === signed.publicId &&
    typeof uploaded.asset_id === "string"
  ) {
    return confirmAvatar(identity.idToken, uploaded.public_id, uploaded.asset_id);
  }

  throw new Error("Cloudinary n'a pas retourné un identifiant d'asset valide.");
}
