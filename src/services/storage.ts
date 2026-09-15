import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 15000;

export class AvatarUploadError extends Error {}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
  ErrorClass: new (message: string) => Error = AvatarUploadError
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new ErrorClass(message)), ms)),
  ]);
}

export async function uploadAvatarFile(uid: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new AvatarUploadError("Selecione um arquivo de imagem.");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new AvatarUploadError("Imagem muito grande. Máximo de 5MB.");
  }

  const path = `avatars/${uid}/${Date.now()}-${file.name}`;
  const fileRef = ref(storage, path);
  const timeoutMessage = "Envio de foto indisponível no momento. Tente novamente mais tarde.";
  await withTimeout(uploadBytes(fileRef, file, { contentType: file.type }), UPLOAD_TIMEOUT_MS, timeoutMessage);
  return withTimeout(getDownloadURL(fileRef), UPLOAD_TIMEOUT_MS, timeoutMessage);
}

// Best-effort: an old avatar being gone already, or the URL not pointing at
// our own bucket (e.g. a leftover manually-typed URL from before uploads
// existed), should never block removing/replacing the avatar in the profile.
export async function deleteAvatarFile(url: string | undefined): Promise<void> {
  if (!url || !url.includes("firebasestorage")) return;
  try {
    await deleteObject(ref(storage, url));
  } catch (err) {
    console.warn("Falha ao remover avatar antigo (ignorado):", err);
  }
}

const MAX_COVER_BYTES = 8 * 1024 * 1024;

export class CoverUploadError extends Error {}

export async function uploadCoverFile(uid: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new CoverUploadError("Selecione um arquivo de imagem.");
  }
  if (file.size > MAX_COVER_BYTES) {
    throw new CoverUploadError("Imagem muito grande. Máximo de 8MB.");
  }

  const path = `covers/${uid}/${Date.now()}-${file.name}`;
  const fileRef = ref(storage, path);
  const timeoutMessage = "Envio de capa indisponível no momento. Tente novamente mais tarde.";
  await withTimeout(uploadBytes(fileRef, file, { contentType: file.type }), UPLOAD_TIMEOUT_MS, timeoutMessage, CoverUploadError);
  return withTimeout(getDownloadURL(fileRef), UPLOAD_TIMEOUT_MS, timeoutMessage, CoverUploadError);
}

// Same reasoning as deleteAvatarFile — best-effort, never blocks the save.
export async function deleteCoverFile(url: string | undefined): Promise<void> {
  if (!url || !url.includes("firebasestorage")) return;
  try {
    await deleteObject(ref(storage, url));
  } catch (err) {
    console.warn("Falha ao remover capa antiga (ignorado):", err);
  }
}
