import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import type { MediaType, Post, PostMention, PostVisibility } from "../types";
import type { Json, Tables, TablesUpdate } from "../services/database.types";

// PostMention[] is structurally a valid jsonb value but has no index
// signature, which is all Json requires it to prove — this cast is that
// proof, not a type-safety escape hatch.
function mentionsToJson(mentions: PostMention[]): Json {
  return mentions as unknown as Json;
}

type PostRow = Tables<"posts">;

export function rowToPost(row: PostRow): Post {
  return {
    id: row.id,
    authorUid: row.author_uid,
    authorName: row.author_name,
    authorAvatarUrl: row.author_avatar_url ?? undefined,
    tmdbId: row.tmdb_id ?? undefined,
    mediaType: row.media_type as Post["mediaType"],
    type: row.type as MediaType,
    title: row.title,
    coverUrl: row.cover_url,
    rating: Number(row.rating),
    review: row.review,
    visibility: row.visibility as PostVisibility,
    createdAt: new Date(row.created_at).getTime(),
    likeCount: row.like_count,
    commentCount: row.comment_count,
    mentions: (row.mentions as unknown as PostMention[] | null) ?? [],
    mentionsAll: row.mentions_all,
  };
}

export function useFeed(uid: string | null, friendUids: string[], limitCount = 60) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const friendKey = friendUids.join(",");

  useEffect(() => {
    if (!uid) {
      setPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;
    const ids = [uid, ...friendUids];

    async function refetch() {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .in("author_uid", ids)
        .order("created_at", { ascending: false })
        .limit(limitCount);
      if (cancelled) return;
      if (error) {
        console.error("Falha ao carregar feed:", error);
      } else {
        // Visibility (own/public/friends) is already the exact boundary
        // posts_select_visible enforces server-side — RLS silently drops a
        // friend's "private" post from these results on its own, so the
        // query doesn't need to re-encode that logic client-side.
        setPosts((data ?? []).map(rowToPost));
      }
      setLoading(false);
    }

    refetch();

    // No column-list filter on the realtime subscription (postgres_changes
    // filters only support simple single-column comparisons, not "author_uid
    // in (...)") — subscribing broadly and refetching is fine because
    // Realtime only delivers events for rows this session's RLS already
    // allows it to read, so it can't over-notify.
    const channel = supabase
      .channel(`posts:${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => refetch())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [uid, friendKey, limitCount]);

  const trending = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const counts = new Map<
      number,
      { tmdbId: number; title: string; coverUrl: string; type: Post["type"]; mediaType: Post["mediaType"]; count: number }
    >();
    for (const p of posts) {
      if (!p.tmdbId || p.createdAt < cutoff) continue;
      const existing = counts.get(p.tmdbId);
      if (existing) existing.count += 1;
      else counts.set(p.tmdbId, { tmdbId: p.tmdbId, title: p.title, coverUrl: p.coverUrl, type: p.type, mediaType: p.mediaType, count: 1 });
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [posts]);

  return { posts, loading, trending };
}

// Notification fan-out (new_post + @mentions) all happens server-side inside
// the publish_post RPC, atomically with the insert — no separate client-side
// notify calls needed (unlike the old Firestore writeBatch/best-effort loop).
export async function publishPost(data: {
  tmdbId?: number;
  mediaType: "movie" | "tv";
  type: MediaType;
  title: string;
  coverUrl: string;
  rating: number;
  review: string;
  visibility: PostVisibility;
  mentions: PostMention[];
  mentionsAll: boolean;
}): Promise<string> {
  const { data: row, error } = await supabase.rpc("publish_post", {
    // Codegen types this as non-nullable `number` even though the
    // underlying Postgres param (and column) genuinely accepts null —
    // it doesn't infer function-arg nullability the way it does for
    // table columns. Runtime accepts null fine; this cast just corrects
    // the generated type.
    p_tmdb_id: (data.tmdbId ?? null) as number,
    p_media_type: data.mediaType,
    p_type: data.type,
    p_title: data.title,
    p_cover_url: data.coverUrl,
    p_rating: data.rating,
    p_review: data.review,
    p_visibility: data.visibility,
    p_mentions: mentionsToJson(data.mentions),
    p_mentions_all: data.mentionsAll,
  });
  if (error) throw error;
  return row.id;
}

export async function deletePost(postId: string): Promise<void> {
  // ON DELETE CASCADE on notifications.post_id/likes.post_id/comments.post_id
  // wipes everything derived from this post automatically — no more manual
  // cross-inbox notification cleanup pass beforehand.
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}

export async function updatePostContent(
  postId: string,
  fields: Partial<Pick<Post, "rating" | "review" | "visibility" | "mentions" | "mentionsAll">>
): Promise<void> {
  const patch: TablesUpdate<"posts"> = {};
  if (fields.rating !== undefined) patch.rating = fields.rating;
  if (fields.review !== undefined) patch.review = fields.review;
  if (fields.visibility !== undefined) patch.visibility = fields.visibility;
  if (fields.mentions !== undefined) patch.mentions = mentionsToJson(fields.mentions);
  if (fields.mentionsAll !== undefined) patch.mentions_all = fields.mentionsAll;
  const { error } = await supabase.from("posts").update(patch).eq("id", postId);
  if (error) throw error;
}

export async function toggleLike(postId: string): Promise<void> {
  const { error } = await supabase.rpc("toggle_like", { p_post_id: postId });
  if (error) throw error;
}

export async function addComment(
  postId: string,
  comment: { text: string; mentions?: PostMention[]; mentionsAll?: boolean }
): Promise<void> {
  const { error } = await supabase.rpc("add_comment", {
    p_post_id: postId,
    p_text: comment.text,
    p_mentions: mentionsToJson(comment.mentions ?? []),
    p_mentions_all: comment.mentionsAll ?? false,
  });
  if (error) throw error;
}

export async function updateComment(
  postId: string,
  commentId: string,
  text: string,
  mentions: PostMention[] = [],
  mentionsAll = false
): Promise<void> {
  const { error } = await supabase
    .from("comments")
    .update({ text, mentions: mentionsToJson(mentions), mentions_all: mentionsAll, edited_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("post_id", postId);
  if (error) throw error;
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  // comments_decrement_count trigger keeps posts.comment_count correct —
  // no separate transaction needed for the counter.
  const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("post_id", postId);
  if (error) throw error;
}

export function defaultVisibilityLabel(v: PostVisibility): string {
  if (v === "public") return "Público";
  if (v === "friends") return "Amigos";
  return "Só eu";
}
