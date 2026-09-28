import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";

// Only the current user's own "who do I follow" set is kept live/local —
// everything else (a target profile's follower/following counts) is a cheap
// head-count query fetched where it's shown (PublicProfileModal), same
// pattern as that modal's genre-prefs/top-10 fetches.
export function useFollows(uid: string | null) {
  const [followingUids, setFollowingUids] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setFollowingUids(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;

    async function refetch() {
      const { data, error } = await supabase.from("follows").select("followed_uid").eq("follower_uid", uid as string);
      if (cancelled) return;
      if (error) {
        console.error("Falha ao carregar quem você segue:", error);
      } else {
        setFollowingUids(new Set((data ?? []).map((r) => r.followed_uid)));
      }
      setLoading(false);
    }

    refetch();

    const channel = supabase
      .channel(`follows:${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "follows", filter: `follower_uid=eq.${uid}` }, () =>
        refetch()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [uid]);

  const isFollowing = useMemo(() => (targetUid: string) => followingUids.has(targetUid), [followingUids]);

  async function follow(targetUid: string) {
    if (!uid || uid === targetUid) return;
    const { error } = await supabase.from("follows").insert({ follower_uid: uid, followed_uid: targetUid });
    if (error) throw error;
  }

  async function unfollow(targetUid: string) {
    if (!uid) return;
    const { error } = await supabase.from("follows").delete().eq("follower_uid", uid).eq("followed_uid", targetUid);
    if (error) throw error;
  }

  return { followingUids, isFollowing, follow, unfollow, loading };
}

export async function fetchFollowCounts(uid: string): Promise<{ followers: number; following: number }> {
  const [followers, following] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("followed_uid", uid),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_uid", uid),
  ]);
  return { followers: followers.count ?? 0, following: following.count ?? 0 };
}
