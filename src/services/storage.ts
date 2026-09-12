import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 15000;

export class AvatarUploadError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new AvatarUploadError(message)), ms)),
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
