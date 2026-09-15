import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";
import { DEFAULT_PROFILE_VISIBILITY, DEFAULT_FEED_VISIBILITY, type ProfileVisibility, type PostVisibility, type User, type UserRole } from "../types";
import { isValidTag } from "../utils/validation";
import type { Tables } from "../services/database.types";

// The rest of the app only ever reads `.uid` off this — kept minimal
// (rather than exposing Supabase's full Session/User shape) so nothing
// downstream needs to know which auth provider is behind it.
export interface AuthUser {
  uid: string;
  email: string | null;
}

type ProfileRow = Tables<"profiles">;

function rowToProfile(row: ProfileRow): User {
  return {
    name: row.name,
    email: row.email,
    favoriteGenreIds: row.favorite_genre_ids,
    role: row.role as UserRole,
    avatarUrl: row.avatar_url ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    birthdate: row.birthdate ?? undefined,
    handle: row.handle ?? undefined,
    profileVisibility: row.profile_visibility as ProfileVisibility,
    feedVisibility: row.feed_visibility as PostVisibility,
    autoShareOnWatched: row.auto_share_on_watched,
  };
}

function profileToRow(user: User) {
  return {
    name: user.name,
    birthdate: user.birthdate ?? null,
    avatar_url: user.avatarUrl ?? null,
    cover_url: user.coverUrl ?? null,
    favorite_genre_ids: user.favoriteGenreIds,
    profile_visibility: user.profileVisibility ?? DEFAULT_PROFILE_VISIBILITY,
    feed_visibility: user.feedVisibility ?? DEFAULT_FEED_VISIBILITY,
    auto_share_on_watched: user.autoShareOnWatched ?? false,
  };
}

async function fetchProfile(uid: string): Promise<User> {
  // No race to worry about here (unlike the old Firebase flow, which had to
  // create this doc itself after auth completed): handle_new_user() creates
  // the row inside the SAME transaction as the auth.users insert, so it
  // already exists by the time any client can hold a session for this uid.
  const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).single();
  if (error) throw error;
  return rowToProfile(data);
}

export function useAuth() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<"password" | "google.com">("password");

  useEffect(() => {
    async function applySession(session: Session | null) {
      if (!session?.user) {
        setAuthUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      setAuthUser({ uid: session.user.id, email: session.user.email ?? null });
      setProvider(session.user.app_metadata?.provider === "google" ? "google.com" : "password");
      try {
        setProfile(await fetchProfile(session.user.id));
      } catch (err) {
        // A failed profile read must never leave the app stuck on the
        // loading screen forever — fall through to null so the user sees
        // the auth screen (and can retry) instead of a frozen spinner.
        console.error("Falha ao carregar perfil:", err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    // onAuthStateChange fires immediately with the current session (event
    // INITIAL_SESSION) and again on every subsequent change — no separate
    // getSession() call needed, same shape as the old onAuthStateChanged.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signUp(name: string, email: string, password: string, tag: string) {
    const trimmedTag = tag.trim();
    if (!isValidTag(trimmedTag)) {
      throw Object.assign(new Error("invalid-tag"), { code: "app/invalid-tag" });
    }

    // Checked up front because a duplicate-handle failure INSIDE the
    // signup trigger surfaces as an opaque "Database error saving new
    // user" (verified empirically against this project) — this is what
    // lets the UI show a precise "TAG taken" message instead.
    const { data: available, error: availErr } = await supabase.rpc("is_handle_available", {
      candidate: trimmedTag,
    });
    if (availErr) throw availErr;
    if (!available) {
      throw Object.assign(new Error("tag-taken"), { code: "app/tag-taken" });
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, handle: trimmedTag } },
    });
    if (error) throw error;
    // onAuthStateChange picks up the new session and loads the profile row
    // (already created server-side by the handle_new_user trigger).
  }

  async function logIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function logInWithGoogle() {
    // Redirect-based, not a popup — Supabase's standard OAuth flow (works
    // better on mobile, no popup-blocker edge cases). The browser navigates
    // to Google and back; onAuthStateChange picks up the session on return.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  async function logOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async function resetPassword(email: string) {
    // Without redirectTo, the link falls back to the project's configured
    // Site URL (Supabase dashboard → Auth → URL Configuration), which may
    // not point at this deployment — pin it explicitly to wherever the app
    // is actually running.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    if (error) throw error;
  }

  async function saveProfile(next: User) {
    if (!authUser) return;
    const { error } = await supabase.from("profiles").update(profileToRow(next)).eq("id", authUser.uid);
    if (error) throw error;
    setProfile(next);
  }

  // "google.com" accounts have no password — hide password-change UI.
  const authProvider = provider;

  async function changeEmail(newEmail: string) {
    if (!authUser) return;
    // Supabase's "secure email change" sends a confirmation link to the new
    // address — the auth email only actually changes once it's clicked,
    // same two-step behavior as before. profiles.email is deliberately left
    // untouched here, matching the old app's behavior exactly.
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) throw error;
  }

  // TAG uniqueness is now a plain UNIQUE index (case-insensitive) on
  // profiles.handle — the update either succeeds or fails atomically with a
  // 23505 unique_violation, no reservation-transaction dance needed.
  async function changeHandle(newTag: string) {
    if (!authUser || !profile) return;
    const trimmed = newTag.trim();
    if (!isValidTag(trimmed)) {
      throw Object.assign(new Error("invalid-tag"), { code: "app/invalid-tag" });
    }

    const { error } = await supabase.from("profiles").update({ handle: trimmed }).eq("id", authUser.uid);
    if (error) {
      if (error.code === "23505") {
        throw Object.assign(new Error("tag-taken"), { code: "app/tag-taken" });
      }
      throw error;
    }

    setProfile({ ...profile, handle: trimmed });
  }

  async function changePassword(newPassword: string) {
    if (!authUser) return;
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  async function deleteAccount() {
    if (!authUser) return;
    // Deletes the caller's own auth.users row via a SECURITY DEFINER RPC
    // (there's no client-side self-delete call in supabase-js — that's
    // admin-API-only, which must never run in the browser). Everything
    // else (catalog, posts, friendships, notifications...) cascades from
    // there via FK ON DELETE CASCADE — confirmed working end to end.
    const { error } = await supabase.rpc("delete_my_account");
    if (error) throw error;
  }

  return {
    authUser,
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
