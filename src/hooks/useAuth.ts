import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile as updateFirebaseAuthProfile,
  verifyBeforeUpdateEmail,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { deleteAvatarFile } from "../services/storage";
import { DEFAULT_PROFILE_VISIBILITY, resolvePrivacy, type User } from "../types";
import { isValidTag } from "../utils/validation";

const ADMIN_EMAILS = ["lennonreis619@gmail.com"];

function profileRef(uid: string) {
  return doc(db, "profiles", uid);
}

function publicProfileRef(uid: string) {
  return doc(db, "publicProfiles", uid);
}

function handleDocRef(tagLower: string) {
  return doc(db, "handles", tagLower);
}

function genrePrefsRef(uid: string) {
  return doc(db, "profiles", uid, "publicMeta", "genres");
}

// Denormalized so a friend (or the public, if this profile is public) can
// see genre preferences on the profile card without profiles/{uid} itself
// being readable — same best-effort, non-blocking reasoning as
// syncPublicProfile.
function syncGenrePrefs(uid: string, genreIds: number[]): void {
  setDoc(genrePrefsRef(uid), { genreIds }).catch((err) =>
    console.warn("Falha ao sincronizar gêneros favoritos (não bloqueia):", err)
  );
}

// Best-effort: reflect this user's current name/avatar/TAG on every
// existing friendship's denormalized snapshot, so friends see the change
// without needing to re-add each other. A failure here never undoes the
// profile change itself that triggered it — it's just cosmetic sync.
async function syncFriendshipSnapshots(uid: string, patch: Record<string, unknown>): Promise<void> {
  try {
    const friendshipsSnap = await getDocs(
      query(collection(db, "friendships"), where("uids", "array-contains", uid))
    );
    for (let i = 0; i < friendshipsSnap.docs.length; i += 400) {
      const batch = writeBatch(db);
      for (const d of friendshipsSnap.docs.slice(i, i + 400)) batch.update(d.ref, patch);
      await batch.commit();
    }
  } catch (err) {
    console.warn("Falha ao propagar perfil pros amigos (não bloqueia a alteração):", err);
  }
}

const HANDLE_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

// Generates a stable, shareable handle like "@L7nnoca" — first letter of
// the name plus 6 random characters. Not reserved/checked for uniqueness
// against other handles: at 36^6 (~2.2 billion) combinations a collision is
// negligible at this app's scale, so we skip the extra transaction/lookup
// a hard-uniqueness guarantee would need.
function generateHandle(name: string): string {
  const firstLetter = (name.trim().replace(/[^a-zA-Z]/g, "").charAt(0) || "U").toUpperCase();
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += HANDLE_CHARS[Math.floor(Math.random() * HANDLE_CHARS.length)];
  }
  return `@${firstLetter}${suffix}`;
}

// One-time: TAGs used to start with "#"; @mentions now reuse the same TAG
// for both finding friends and mentioning them in posts/comments, so every
// TAG needs the "@" prefix. Migrates a legacy "#"-prefixed handle the same
// transactional way as changeHandle. Best-effort and non-blocking — same
// reasoning as syncPublicProfile, a failure here just means the account
// keeps its old-prefix handle until the next login retries it.
async function migrateHandlePrefix(uid: string, profile: User): Promise<User> {
  if (!profile.handle || profile.handle.startsWith("@")) return profile;

  const newHandle = `@${profile.handle.slice(1)}`;
  const newTagLower = newHandle.toLowerCase();
  const oldTagLower = profile.handle.toLowerCase();
  let migrated = false;

  try {
    await runTransaction(db, async (tx) => {
      const targetSnap = await tx.get(handleDocRef(newTagLower));
      if (targetSnap.exists() && (targetSnap.data() as { uid: string }).uid !== uid) {
        // Extremely unlikely collision between the old "#" and new "@"
        // handle spaces — skip the rename rather than fail login.
        return;
      }
      tx.set(handleDocRef(newTagLower), { uid });
      tx.delete(handleDocRef(oldTagLower));
      tx.set(profileRef(uid), { ...profile, handle: newHandle });
      tx.set(publicProfileRef(uid), { handle: newHandle, handleLower: newTagLower }, { merge: true });
      migrated = true;
    });
  } catch (err) {
    console.warn("Falha ao migrar TAG de # pra @ (tenta de novo no próximo login):", err);
    return profile;
  }

  if (!migrated) return profile;
  const next = { ...profile, handle: newHandle };
  syncFriendshipSnapshots(uid, { [`profiles.${uid}.handle`]: newHandle });
  return next;
}

// Keeps the cross-user-readable slice of a profile in sync. Never include
// email or any other private field here — see firestore.rules.
//
// Best-effort and non-blocking on purpose: this backs the social feed
// feature, not authentication. A denied/failed write here (e.g. rules not
// deployed yet) must never break login/signup, so callers fire this and
// move on instead of awaiting it.
function syncPublicProfile(uid: string, profile: User): void {
  const handle = profile.handle ?? generateHandle(profile.name);
  setDoc(publicProfileRef(uid), {
    uid,
    name: profile.name,
    nameLower: profile.name.trim().toLowerCase(),
    handle,
    handleLower: handle.toLowerCase(),
    avatarUrl: profile.avatarUrl ?? null,
    coverUrl: profile.coverUrl ?? null,
    profileVisibility: resolvePrivacy(profile).profileVisibility,
  }).catch((err) => console.warn("Falha ao sincronizar perfil público (não bloqueia login):", err));
}

// Firebase requires a "recent" sign-in before letting an account change
// email/password or delete itself. Google-signed-in accounts have no
// password to confirm with, so they reauthenticate via the Google popup
// again instead.
async function reauthenticate(user: FirebaseUser, currentPassword?: string) {
  const providerId = user.providerData[0]?.providerId;
  if (providerId === "google.com") {
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
    return;
  }

  if (!currentPassword || !user.email) {
    throw Object.assign(new Error("missing-current-password"), { code: "auth/missing-password" });
  }
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
}

// One-time: ratings moved from a 0-5 to a 0-10 scale (5 stars stayed the
// visual cap, but each star is now worth 2 points instead of 1). Existing
// values are doubled so a movie rated 5/5 stays 5/5 stars (10/10) instead
// of silently becoming 5/10 (2.5 stars). Runs once per account, gated by
// User.ratingsMigratedV2 — safe to skip if it ever fails, just means the
// account's old ratings stay half-scale until the next login retries it.
async function migrateRatingsToV2(uid: string): Promise<void> {
  const catalogSnap = await getDocs(collection(db, "profiles", uid, "catalog"));
  for (let i = 0; i < catalogSnap.docs.length; i += 400) {
    const batch = writeBatch(db);
    for (const d of catalogSnap.docs.slice(i, i + 400)) {
      const rating = (d.data().rating as number) ?? 0;
      if (rating > 0) batch.update(d.ref, { rating: Math.min(10, rating * 2) });
    }
    await batch.commit();
  }

  const postsSnap = await getDocs(query(collection(db, "posts"), where("authorUid", "==", uid)));
  for (let i = 0; i < postsSnap.docs.length; i += 400) {
    const batch = writeBatch(db);
    for (const d of postsSnap.docs.slice(i, i + 400)) {
      const rating = (d.data().rating as number) ?? 0;
      if (rating > 0) batch.update(d.ref, { rating: Math.min(10, rating * 2) });
    }
    await batch.commit();
  }
}

async function ensureProfile(firebaseUser: FirebaseUser, fallbackName?: string): Promise<User> {
  const ref = profileRef(firebaseUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const existing = snap.data() as User;

    if (!existing.handle) {
      // Backfill: accounts created before handles existed. Non-blocking —
      // same reasoning as syncPublicProfile, a failed write here shouldn't
      // stop the user from logging in with the handle-less profile for now.
      const backfilled: User = { ...existing, handle: generateHandle(existing.name) };
      setDoc(ref, backfilled).catch((err) => console.warn("Falha ao gerar handle:", err));
      syncPublicProfile(firebaseUser.uid, backfilled);
      return backfilled;
    }

    // Re-sync on every login, not just when the handle is missing: if the
    // publicProfiles write ever failed before (e.g. rules not deployed yet
    // at signup time), the account would otherwise never become
    // searchable again since this branch used to only run once. Cheap and
    // idempotent, so unconditional is fine.
    syncPublicProfile(firebaseUser.uid, existing);
    syncGenrePrefs(firebaseUser.uid, existing.favoriteGenreIds);

    let profile = existing;

    profile = await migrateHandlePrefix(firebaseUser.uid, profile);

    if (!profile.ratingsMigratedV2) {
      try {
        await migrateRatingsToV2(firebaseUser.uid);
        profile = { ...profile, ratingsMigratedV2: true };
      } catch (err) {
        console.warn("Falha ao migrar avaliações pra escala 0-10 (tenta de novo no próximo login):", err);
      }
    }

    if (profile !== existing) await setDoc(ref, profile);
    return profile;
  }

  const profile: User = {
    name: fallbackName ?? firebaseUser.displayName ?? "Usuário",
    email: firebaseUser.email ?? "",
    favoriteGenreIds: [],
    role: ADMIN_EMAILS.includes(firebaseUser.email ?? "") ? "admin" : "user",
    handle: generateHandle(fallbackName ?? firebaseUser.displayName ?? "Usuário"),
    profileVisibility: DEFAULT_PROFILE_VISIBILITY,
    ratingsMigratedV2: true, // brand-new account, no legacy 0-5 ratings to convert
  };
  await setDoc(ref, profile);
  syncPublicProfile(firebaseUser.uid, profile);
  return profile;
}

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      try {
        if (fbUser) {
          setProfile(await ensureProfile(fbUser));
        } else {
          setProfile(null);
        }
      } catch (err) {
        // A failed profile read/create must never leave the app stuck on
        // the loading screen forever — fall through to null so the user
        // sees the auth screen (and can retry) instead of a frozen spinner.
        console.error("Falha ao carregar perfil:", err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  async function signUp(name: string, email: string, password: string, tag: string) {
    const trimmedTag = tag.trim();
    if (!isValidTag(trimmedTag)) {
      throw Object.assign(new Error("invalid-tag"), { code: "app/invalid-tag" });
    }
    const tagLower = trimmedTag.toLowerCase();

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateFirebaseAuthProfile(cred.user, { displayName: name });

    // onAuthStateChanged fires as soon as the account is created (before
    // displayName is set above) and may race this function to create the
    // Firestore doc with a stale fallback name. Overwrite unconditionally
    // with the authoritative data so this call always wins.
    const profile: User = {
      name,
      email: cred.user.email ?? email,
      favoriteGenreIds: [],
      role: ADMIN_EMAILS.includes(cred.user.email ?? "") ? "admin" : "user",
      handle: trimmedTag,
      profileVisibility: DEFAULT_PROFILE_VISIBILITY,
      ratingsMigratedV2: true,
    };

    const uid = cred.user.uid;
    try {
      // Reserve the chosen TAG for real (same transaction shape as
      // changeHandle) instead of trusting the client — two people signing
      // up with the same TAG at once must not both win it.
      await runTransaction(db, async (tx) => {
        const tagSnap = await tx.get(handleDocRef(tagLower));
        if (tagSnap.exists()) {
          throw Object.assign(new Error("tag-taken"), { code: "app/tag-taken" });
        }
        tx.set(handleDocRef(tagLower), { uid });
        tx.set(profileRef(uid), profile);
        tx.set(publicProfileRef(uid), {
          uid,
          name: profile.name,
          nameLower: profile.name.trim().toLowerCase(),
          handle: trimmedTag,
          handleLower: tagLower,
          avatarUrl: null,
          coverUrl: null,
          profileVisibility: resolvePrivacy(profile).profileVisibility,
        });
      });
    } catch (err) {
      // The Auth account exists but got no profile — roll it back so a
      // taken-TAG failure doesn't leave an orphaned, profile-less account.
      await deleteUser(cred.user).catch(() => {});
      throw err;
    }

    setProfile(profile);
  }

  async function logIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged handles loading/creating the profile for this uid.
  }

  async function logInWithGoogle() {
    await signInWithPopup(auth, new GoogleAuthProvider());
    // onAuthStateChanged handles loading/creating the profile for this uid.
  }

  async function logOut() {
    await signOut(auth);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  async function saveProfile(next: User) {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const prevSnapshot = { name: profile?.name, avatarUrl: profile?.avatarUrl ?? null };
    const nextSnapshot = { name: next.name, avatarUrl: next.avatarUrl ?? null };

    await setDoc(profileRef(uid), next);
    syncPublicProfile(uid, next);
    syncGenrePrefs(uid, next.favoriteGenreIds);
    setProfile(next);

    if (
      prevSnapshot.name !== nextSnapshot.name ||
      prevSnapshot.avatarUrl !== nextSnapshot.avatarUrl
    ) {
      await syncFriendshipSnapshots(uid, {
        [`profiles.${uid}.name`]: nextSnapshot.name,
        [`profiles.${uid}.avatarUrl`]: nextSnapshot.avatarUrl,
      });
    }
  }

  // "google.com" accounts have no password — hide password-change UI and
  // reauthenticate via popup instead of a current-password field.
  const authProvider: "password" | "google.com" =
    firebaseUser?.providerData[0]?.providerId === "google.com" ? "google.com" : "password";

  async function changeEmail(newEmail: string, currentPassword?: string) {
    if (!firebaseUser) return;
    await reauthenticate(firebaseUser, currentPassword);
    // Auth's email only updates once the user clicks the link sent to
    // newEmail — profiles/{uid}.email is intentionally left alone here so
    // it never drifts out of sync with the still-unconfirmed Auth email.
    await verifyBeforeUpdateEmail(firebaseUser, newEmail);
  }

  // TAG is user-chosen (unlike the random default), so uniqueness must be
  // enforced for real via the `handles/{tagLower}` reservation collection —
  // a transaction so two people can't both claim the same TAG in a race.
  async function changeHandle(newTag: string) {
    if (!firebaseUser || !profile) return;
    const trimmed = newTag.trim();
    if (!isValidTag(trimmed)) {
      throw Object.assign(new Error("invalid-tag"), { code: "app/invalid-tag" });
    }

    const uid = firebaseUser.uid;
    const newTagLower = trimmed.toLowerCase();
    const oldTagLower = profile.handle?.toLowerCase();

    await runTransaction(db, async (tx) => {
      if (newTagLower !== oldTagLower) {
        const targetSnap = await tx.get(handleDocRef(newTagLower));
        if (targetSnap.exists() && (targetSnap.data() as { uid: string }).uid !== uid) {
          throw Object.assign(new Error("tag-taken"), { code: "app/tag-taken" });
        }
        tx.set(handleDocRef(newTagLower), { uid });
        if (oldTagLower) tx.delete(handleDocRef(oldTagLower));
      }
      tx.set(profileRef(uid), { ...profile, handle: trimmed });
      tx.set(publicProfileRef(uid), { handle: trimmed, handleLower: newTagLower }, { merge: true });
    });

    setProfile({ ...profile, handle: trimmed });
    await syncFriendshipSnapshots(uid, { [`profiles.${uid}.handle`]: trimmed });
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!firebaseUser) return;
    await reauthenticate(firebaseUser, currentPassword);
    await updatePassword(firebaseUser, newPassword);
  }

  async function deleteAccount(currentPassword?: string) {
    if (!firebaseUser) return;
    await reauthenticate(firebaseUser, currentPassword);

    const uid = firebaseUser.uid;
    const catalogSnap = await getDocs(collection(db, "profiles", uid, "catalog"));
    for (let i = 0; i < catalogSnap.docs.length; i += 400) {
      const batch = writeBatch(db);
      for (const d of catalogSnap.docs.slice(i, i + 400)) batch.delete(d.ref);
      await batch.commit();
    }

    await deleteAvatarFile(profile?.avatarUrl);
    await deleteDoc(publicProfileRef(uid));
    await deleteDoc(profileRef(uid));

    // Cross-collection references (friendships, posts, likes, comments)
    // aren't cascaded — no Cloud Functions to sweep them, same accepted
    // limit as the rest of the social feature at this app's scale.
    await deleteUser(firebaseUser);
  }

  return {
    firebaseUser,
    profile,
    loading,
    authProvider,
    signUp,
    logIn,
    logInWithGoogle,
    logOut,
    saveProfile,
    resetPassword,
    changeEmail,
    changePassword,
    changeHandle,
    deleteAccount,
  };
}
