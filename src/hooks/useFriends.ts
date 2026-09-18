import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import type { Friendship } from "../types";
import type { Tables } from "../services/database.types";

type FriendshipRow = Tables<"friendships">;

function pairId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

// friendships no longer carries a denormalized name/avatar/handle snapshot
// (it's a live join to public_profiles instead — see the migrations) — this
// rebuilds the SAME `profiles: {uid: {...}}` shape the rest of the app
// already expects, so nothing downstream (FriendsPanel, NotificationBell,
// PublicProfileModal, App.tsx) needs to change.
async function attachProfiles(rows: FriendshipRow[], uid: string): Promise<Friendship[]> {
  const otherUids = Array.from(new Set(rows.map((r) => (r.uid_a === uid ? r.uid_b : r.uid_a))));
  if (otherUids.length === 0) return [];

  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("uid, name, avatar_url, handle")
    .in("uid", [...otherUids, uid]);

  const byUid = new Map((profiles ?? []).map((p) => [p.uid, p]));

  return rows.map((r) => {
    const a = byUid.get(r.uid_a);
    const b = byUid.get(r.uid_b);
    return {
      id: pairId(r.uid_a, r.uid_b),
      uids: [r.uid_a, r.uid_b] as [string, string],
      requestedBy: r.requested_by,
      status: r.status as Friendship["status"],
      createdAt: new Date(r.created_at).getTime(),
      respondedAt: r.responded_at ? new Date(r.responded_at).getTime() : undefined,
      profiles: {
        [r.uid_a]: { name: a?.name ?? "Usuário", avatarUrl: a?.avatar_url ?? undefined, handle: a?.handle ?? undefined },
        [r.uid_b]: { name: b?.name ?? "Usuário", avatarUrl: b?.avatar_url ?? undefined, handle: b?.handle ?? undefined },
      },
    };
  });
}

export interface FriendSuggestion {
  uid: string;
  name: string;
  handle: string | null;
  avatarUrl?: string;
  mutualCount: number;
}

export function useFriends(uid: string | null) {
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setFriendships([]);
      setLoading(false);
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    setLoading(true);
    setSuggestionsLoading(true);
    let cancelled = false;

    async function refetch() {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`uid_a.eq.${uid},uid_b.eq.${uid}`);
      if (cancelled) return;
      if (error) {
        console.error("Falha ao carregar amizades:", error);
        setLoading(false);
        return;
      }
      setFriendships(await attachProfiles(data ?? [], uid as string));
      setLoading(false);
    }

    // Recomputed on the same trigger as friendships (any accept/decline/send
    // changes who's already a friend or has a pending request, which the RPC
    // excludes) — see 20260918114804_suggested_friends.sql for the query.
    async function refetchSuggestions() {
      const { data, error } = await supabase.rpc("suggested_friends", { p_limit: 10 });
      if (cancelled) return;
      if (error) {
        console.error("Falha ao carregar sugestões de amigos:", error);
        setSuggestions([]);
      } else {
        setSuggestions(
          (data ?? []).map((row) => ({
            uid: row.uid,
            name: row.name,
            handle: row.handle,
            avatarUrl: row.avatar_url ?? undefined,
            mutualCount: row.mutual_count,
          }))
        );
      }
      setSuggestionsLoading(false);
    }

    refetch();
    refetchSuggestions();

    // Realtime's per-channel filter only supports a single equality — a
    // friendship row can have `uid` in either uid_a or uid_b, so two
    // channels (one per side) instead of trying to express the OR in one.
    const channelA = supabase
      .channel(`friendships:a:${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: `uid_a=eq.${uid}` }, () => {
        refetch();
        refetchSuggestions();
      })
      .subscribe();
    const channelB = supabase
      .channel(`friendships:b:${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: `uid_b=eq.${uid}` }, () => {
        refetch();
        refetchSuggestions();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channelA);
      supabase.removeChannel(channelB);
    };
  }, [uid]);

  const accepted = useMemo(() => friendships.filter((f) => f.status === "accepted"), [friendships]);

  const incoming = useMemo(
    () => (uid ? friendships.filter((f) => f.status === "pending" && f.requestedBy !== uid) : []),
    [friendships, uid]
  );

  const outgoing = useMemo(
    () => (uid ? friendships.filter((f) => f.status === "pending" && f.requestedBy === uid) : []),
    [friendships, uid]
  );

  function otherUid(f: Friendship): string {
    return uid ? f.uids.find((u) => u !== uid) ?? "" : "";
  }

  const friendUids = useMemo(() => accepted.map(otherUid), [accepted, uid]);

  function friendshipWith(targetUid: string): Friendship | undefined {
    return friendships.find((f) => f.uids.includes(targetUid));
  }

  async function sendRequest(targetUid: string) {
    if (!uid || uid === targetUid) return;
    const [lo, hi] = uid < targetUid ? [uid, targetUid] : [targetUid, uid];
    const { error } = await supabase.from("friendships").insert({
      uid_a: lo,
      uid_b: hi,
      requested_by: uid,
      status: "pending",
    });
    if (error) throw error;
  }

  async function acceptRequest(id: string) {
    const [a, b] = id.split("_");
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("uid_a", a)
      .eq("uid_b", b);
    if (error) throw error;
  }

  async function declineRequest(id: string) {
    const [a, b] = id.split("_");
    const { error } = await supabase.from("friendships").delete().eq("uid_a", a).eq("uid_b", b);
    if (error) throw error;
  }

  async function removeFriend(id: string) {
    await declineRequest(id);
  }

  return {
    loading,
    accepted,
    incoming,
    outgoing,
    friendUids,
    otherUid,
    friendshipWith,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    suggestions,
    suggestionsLoading,
  };
}
