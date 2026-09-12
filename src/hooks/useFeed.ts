import { useEffect, useMemo, useState } from "react";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../services/firebase";
import type { Post, PostVisibility } from "../types";

function notificationRef(recipientUid: string) {
  return doc(collection(db, "profiles", recipientUid, "notifications"));
}

// Firestore's `in` operator accepts at most 30 values. We reserve none for
// self (self has its own dedicated listener below), so friends beyond the
// 29th most-recently-added simply won't appear in the feed — an accepted
// limit at this app's hobby scale.
const FRIEND_QUERY_CAP = 29;

function toPost(id: string, data: Record<string, unknown>): Post {
  return { id, ...data } as Post;
}

export function useFeed(uid: string | null, friendUids: string[], limitCount = 60) {
  const [ownPosts, setOwnPosts] = useState<Post[]>([]);
  const [friendsPublicPosts, setFriendsPublicPosts] = useState<Post[]>([]);
  const [friendsOnlyPosts, setFriendsOnlyPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const cappedFriendUids = useMemo(() => friendUids.slice(0, FRIEND_QUERY_CAP), [friendUids.join(",")]);
  const friendKey = cappedFriendUids.join(",");

  useEffect(() => {
    if (!uid) {
      setOwnPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "posts"),
      where("authorUid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    return onSnapshot(
      q,
      (snap) => {
        setOwnPosts(snap.docs.map((d) => toPost(d.id, d.data())));
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [uid, limitCount]);

  useEffect(() => {
    if (cappedFriendUids.length === 0) {
      setFriendsPublicPosts([]);
      return;
    }
    const q = query(
      collection(db, "posts"),
      where("authorUid", "in", cappedFriendUids),
      where("visibility", "==", "public"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    return onSnapshot(q, (snap) => setFriendsPublicPosts(snap.docs.map((d) => toPost(d.id, d.data()))));
  }, [friendKey, limitCount]);

  useEffect(() => {
    if (cappedFriendUids.length === 0) {
      setFriendsOnlyPosts([]);
      return;
    }
    const q = query(
      collection(db, "posts"),
      where("authorUid", "in", cappedFriendUids),
      where("visibility", "==", "friends"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    return onSnapshot(q, (snap) => setFriendsOnlyPosts(snap.docs.map((d) => toPost(d.id, d.data()))));
  }, [friendKey, limitCount]);

  const posts = useMemo(() => {
    const map = new Map<string, Post>();
    for (const p of [...ownPosts, ...friendsPublicPosts, ...friendsOnlyPosts]) map.set(p.id, p);
    return Array.from(map.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limitCount);
  }, [ownPosts, friendsPublicPosts, friendsOnlyPosts, limitCount]);

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

export async function createPost(data: Omit<Post, "id">): Promise<string> {
  const ref = doc(collection(db, "posts"));
  await setDoc(ref, data);
  return ref.id;
}

export async function deletePost(postId: string): Promise<void> {
  // Clear dangling notifications in other people's inboxes before the post
  // itself is gone — the delete rule only allows this while the post still
  // exists (it checks the post's authorUid to authorize the cross-inbox
  // delete), so order matters here.
  try {
    const notifsSnap = await getDocs(
      query(collectionGroup(db, "notifications"), where("postId", "==", postId))
    );
    for (let i = 0; i < notifsSnap.docs.length; i += 400) {
      const batch = writeBatch(db);
      for (const d of notifsSnap.docs.slice(i, i + 400)) batch.delete(d.ref);
      await batch.commit();
    }
  } catch (err) {
    console.warn("Falha ao limpar notificações do post (não bloqueia a exclusão):", err);
  }

  await deleteDoc(doc(db, "posts", postId));
}

export async function updatePostContent(
  postId: string,
  fields: Partial<Pick<Post, "rating" | "review" | "visibility">>
): Promise<void> {
  await updateDoc(doc(db, "posts", postId), fields);
}

export async function toggleLike(
  postId: string,
  uid: string,
  likerInfo: { name: string; avatarUrl?: string },
  currentlyLiked: boolean
): Promise<void> {
  const postRef = doc(db, "posts", postId);
  const likeRef = doc(db, "posts", postId, "likes", uid);
  await runTransaction(db, async (tx) => {
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists()) return;
    const post = postSnap.data() as Post;
    const count = post.likeCount ?? 0;
    if (currentlyLiked) {
      tx.delete(likeRef);
      tx.update(postRef, { likeCount: Math.max(0, count - 1) });
    } else {
      tx.set(likeRef, { uid, name: likerInfo.name, avatarUrl: likerInfo.avatarUrl ?? null, createdAt: Date.now() });
      tx.update(postRef, { likeCount: count + 1 });
      if (post.authorUid !== uid) {
        tx.set(notificationRef(post.authorUid), {
          type: "like",
          actorUid: uid,
          actorName: likerInfo.name,
          actorAvatarUrl: likerInfo.avatarUrl ?? null,
          postId,
          postTitle: post.title,
          postCoverUrl: post.coverUrl,
          createdAt: Date.now(),
          read: false,
        });
      }
    }
  });
}

export async function addComment(
  postId: string,
  comment: { authorUid: string; authorName: string; authorAvatarUrl?: string; text: string }
): Promise<void> {
  const postRef = doc(db, "posts", postId);
  const commentRef = doc(collection(db, "posts", postId, "comments"));
  await runTransaction(db, async (tx) => {
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists()) return;
    const post = postSnap.data() as Post;
    const count = post.commentCount ?? 0;
    tx.set(commentRef, { ...comment, createdAt: Date.now() });
    tx.update(postRef, { commentCount: count + 1 });
    if (post.authorUid !== comment.authorUid) {
      tx.set(notificationRef(post.authorUid), {
        type: "comment",
        actorUid: comment.authorUid,
        actorName: comment.authorName,
        actorAvatarUrl: comment.authorAvatarUrl ?? null,
        postId,
        postTitle: post.title,
        postCoverUrl: post.coverUrl,
        commentId: commentRef.id,
        commentPreview: comment.text.slice(0, 80),
        createdAt: Date.now(),
        read: false,
      });
    }
  });
}

export async function updateComment(postId: string, commentId: string, text: string): Promise<void> {
  await updateDoc(doc(db, "posts", postId, "comments", commentId), { text, editedAt: Date.now() });
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  const postRef = doc(db, "posts", postId);
  const commentRef = doc(db, "posts", postId, "comments", commentId);
  await runTransaction(db, async (tx) => {
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists()) return;
    const count = (postSnap.data().commentCount as number) ?? 0;
    tx.delete(commentRef);
    tx.update(postRef, { commentCount: Math.max(0, count - 1) });
  });
}

// Best-effort fan-out: one notification doc per friend. Private posts never
// call this (nothing to notify — friends can't read them anyway). A failed
// write here never blocks publishing the post itself.
export async function notifyFriendsOfNewPost(
  friendUids: string[],
  postId: string,
  actor: { uid: string; name: string; avatarUrl?: string },
  post: { title: string; coverUrl: string }
): Promise<void> {
  if (friendUids.length === 0) return;
  for (let i = 0; i < friendUids.length; i += 400) {
    const batch = writeBatch(db);
    for (const friendUid of friendUids.slice(i, i + 400)) {
      batch.set(notificationRef(friendUid), {
        type: "new_post",
        actorUid: actor.uid,
        actorName: actor.name,
        actorAvatarUrl: actor.avatarUrl ?? null,
        postId,
        postTitle: post.title,
        postCoverUrl: post.coverUrl,
        createdAt: Date.now(),
        read: false,
      });
    }
    await batch.commit();
  }
}

export function defaultVisibilityLabel(v: PostVisibility): string {
  if (v === "public") return "Público";
  if (v === "friends") return "Amigos";
  return "Só eu";
}
