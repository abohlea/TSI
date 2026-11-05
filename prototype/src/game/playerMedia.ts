export interface PlayerAvatarAsset {
  assetId: string;
  publicId: string;
  secureUrl: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function mediaApiUrl(): string {
  const value = (import.meta.env.VITE_TSI_MEDIA_API_URL as string | undefined)?.trim();
  if (!value) throw new Error('Configuration manquante : VITE_TSI_MEDIA_API_URL.');
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('URL du service média invalide.');
  return value.replace(/\/$/, '');
}

async function readJson<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
      ? payload.error : 'Erreur média HTTP ' + response.status + '.';
    throw new Error(message);
  }
  return payload as T;
}

export async function uploadPlayerAvatar(file: File, idToken: string): Promise<PlayerAvatarAsset> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) throw new Error('Avatar : seuls les formats JPG, PNG et WebP sont acceptés.');
  if (file.size < 1 || file.size > MAX_AVATAR_BYTES) throw new Error('Avatar : la taille doit être comprise entre 1 octet et 5 Mio.');

  const response = await fetch(mediaApiUrl() + '/v1/media/avatar/upload', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + idToken, 'Content-Type': file.type },
    body: file
  });
  const confirmed = await readJson<{ avatar: PlayerAvatarAsset }>(response);
  return confirmed.avatar;
}
