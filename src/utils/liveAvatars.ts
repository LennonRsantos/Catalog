import { supabase } from "../services/supabase";

// posts.author_avatar_url / comments.author_avatar_url / likes.avatar_url are
// point-in-time snapshots by design (same reasoning as author_name — an old
// post keeps showing the name someone had back then). The photo itself is
// the one exception the user asked for: it should always reflect whatever
// the profile's CURRENT avatar is, so this re-fetches live values from
// public_profiles (readable regardless of privacy — same "findability"
// slice used everywhere else) and overrides the frozen column with it.
export async function fetchLiveAvatars(uids: string[]): Promise<Map<string, string | undefined>> {
  const unique = Array.from(new Set(uids));
  if (unique.length === 0) return new Map();
  const { data } = await supabase.from("public_profiles").select("uid, avatar_url").in("uid", unique);
  return new Map((data ?? []).map((r) => [r.uid as string, r.avatar_url ?? undefined]));
}
