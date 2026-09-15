import { supabase } from "./supabase";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 15000;

export class AvatarUploadError extends Error {}
export class CoverUploadError extends Error {}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
  ErrorClass: new (message: string) => Error
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new ErrorClass(message)), ms)),
  ]);
}

async function uploadImage(
  bucket: "avatars" | "covers",
  uid: string,
  file: File,
  maxBytes: number,
  timeoutMessage: string,
  ErrorClass: new (message: string) => Error
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new ErrorClass("Selecione um arquivo de imagem.");
  }
  if (file.size > maxBytes) {
    throw new ErrorClass(`Imagem muito grande. Máximo de ${Math.round(maxBytes / (1024 * 1024))}MB.`);
  }

  const path = `${uid}/${Date.now()}-${file.name}`;
  const { error } = await withTimeout(
    supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false }),
    UPLOAD_TIMEOUT_MS,
    timeoutMessage,
    ErrorClass
  );
  if (error) throw new ErrorClass(timeoutMessage);

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

// Best-effort: an old file being gone already, or the URL not pointing at
// our own bucket (e.g. a leftover manually-typed URL from before uploads
// existed, or a Firebase Storage URL left over from before the migration),
// should never block removing/replacing the file in the profile.
async function deleteImage(bucket: "avatars" | "covers", url: string | undefined): Promise<void> {
  if (!url) return;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);
  try {
    await supabase.storage.from(bucket).remove([path]);
  } catch (err) {
    console.warn(`Falha ao remover ${bucket} antigo (ignorado):`, err);
  }
}

export function uploadAvatarFile(uid: string, file: File): Promise<string> {
  return uploadImage(
    "avatars",
    uid,
    file,
    MAX_AVATAR_BYTES,
    "Envio de foto indisponível no momento. Tente novamente mais tarde.",
    AvatarUploadError
  );
}

export function deleteAvatarFile(url: string | undefined): Promise<void> {
  return deleteImage("avatars", url);
}

const MAX_COVER_BYTES = 8 * 1024 * 1024;

export function uploadCoverFile(uid: string, file: File): Promise<string> {
  return uploadImage(
    "covers",
    uid,
    file,
    MAX_COVER_BYTES,
    "Envio de capa indisponível no momento. Tente novamente mais tarde.",
    CoverUploadError
  );
}

export function deleteCoverFile(url: string | undefined): Promise<void> {
  return deleteImage("covers", url);
}
