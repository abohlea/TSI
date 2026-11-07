type CloudinaryResource = "image" | "video" | "raw";

type CloudinaryUpload = {
  secure_url: string;
  public_id: string;
  resource_type: string;
  bytes: number;
  format?: string;
};

const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export const cloudinaryConfigured = Boolean(cloudName && uploadPreset);

export async function uploadToCloudinary(
  uri: string,
  resourceType: CloudinaryResource = "image",
  fileName = "tsi-upload"
): Promise<CloudinaryUpload> {
  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary n'est pas configuré. Ajoutez EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME et EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET."
    );
  }

  const form = new FormData();
  form.append("file", {
    uri,
    name: fileName,
    type:
      resourceType === "video"
        ? "video/mp4"
        : resourceType === "image"
          ? "image/jpeg"
          : "application/octet-stream",
  } as unknown as Blob);
  form.append("upload_preset", uploadPreset);
  form.append("folder", "tsi");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    { method: "POST", body: form }
  );

  const payload = (await response.json()) as
    | CloudinaryUpload
    | { error?: { message?: string } };

  if (!response.ok || !("secure_url" in payload)) {
    const message =
      "error" in payload ? payload.error?.message : undefined;
    throw new Error(message || "Échec de l'envoi vers Cloudinary.");
  }

  return payload;
}
