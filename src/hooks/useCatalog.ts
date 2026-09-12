import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../services/firebase";
import type { MediaItem, MediaStatus, MediaType } from "../types";

function catalogRef(uid: string) {
  return collection(db, "profiles", uid, "catalog");
}

function favoritesRef(uid: string) {
  return collection(db, "profiles", uid, "favorites");
}

// Next free 1-10 rank slot for this type, or undefined if all 10 are taken
// (item still counts as a favorite, just without a Top 10 position).
function nextFavoriteRank(items: MediaItem[], type: MediaType): number | undefined {
  const used = new Set(
    items.filter((i) => i.isFavorite && i.type === type && i.favoriteRank != null).map((i) => i.favoriteRank)
  );
  for (let r = 1; r <= 10; r++) {
    if (!used.has(r)) return r;
  }
  return undefined;
}

// Best-effort denormalized copy of favorited items into a cross-user-
// readable subcollection, so a friend's Top 10 can be shown without exposing
// their whole catalog (Quero Ver, progress notes, etc). Never blocks the
// catalog write that triggered it — see firestore.rules for the read gate.
function syncFavoriteSnapshot(uid: string, item: MediaItem): void {
  const ref = doc(favoritesRef(uid), item.id);
  if (item.isFavorite) {
    const data: Record<string, unknown> = {
      tmdbId: item.tmdbId ?? null,
      mediaType: item.type === "Série" ? "tv" : "movie",
      type: item.type,
      title: item.title,
      coverUrl: item.coverUrl,
      rating: item.rating,
      ratedAt: Date.now(),
    };
    if (item.favoriteRank != null) data.favoriteRank = item.favoriteRank;
    setDoc(ref, data).catch((err) => console.warn("Falha ao sincronizar favorito (não bloqueia):", err));
  } else {
    deleteDoc(ref).catch(() => {});
  }
}

export function useCatalog(uid: string | null) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(catalogRef(uid), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ ...(d.data() as Omit<MediaItem, "id">), id: d.id })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsubscribe;
  }, [uid]);

  async function saveItem(item: MediaItem) {
    if (!uid) return;
    let finalItem = item;
    if (item.isFavorite && item.favoriteRank == null) {
      const rank = nextFavoriteRank(items, item.type);
      if (rank !== undefined) finalItem = { ...item, favoriteRank: rank };
    }
    const { id, ...data } = finalItem;
    await setDoc(doc(catalogRef(uid), id), data);
    syncFavoriteSnapshot(uid, finalItem);
  }

  async function updateStatus(id: string, status: MediaStatus) {
    if (!uid) return;
    const data: Record<string, unknown> = { status };
    if (status !== "Visto") {
      data.rating = 0;
      data.review = "";
    }
    if (status !== "Assistindo") {
      data.progressSeason = deleteField();
      data.progressMinutes = deleteField();
      data.progressSeconds = deleteField();
    }
    await updateDoc(doc(catalogRef(uid), id), data);

    const current = items.find((i) => i.id === id);
    if (current) {
      syncFavoriteSnapshot(uid, {
        ...current,
        status,
        rating: status === "Visto" ? current.rating : 0,
        review: status === "Visto" ? current.review : "",
      });
    }
  }

  async function updateRating(id: string, rating: number) {
    if (!uid) return;
    await updateDoc(doc(catalogRef(uid), id), { rating });

    const current = items.find((i) => i.id === id);
    if (current) syncFavoriteSnapshot(uid, { ...current, rating });
  }

  async function updateProgress(
    id: string,
    progress: { progressSeason?: number; progressMinutes?: number; progressSeconds?: number }
  ) {
    if (!uid) return;
    const data: Record<string, unknown> = {
      progressSeason: progress.progressSeason ?? deleteField(),
      progressMinutes: progress.progressMinutes ?? deleteField(),
      progressSeconds: progress.progressSeconds ?? deleteField(),
    };
    await updateDoc(doc(catalogRef(uid), id), data);
  }

  // Explicit favorite toggle, independent of status/rating. Turning on
  // auto-assigns the next free 1-10 rank for that type; turning off clears it.
  async function toggleFavorite(id: string, isFavorite: boolean) {
    if (!uid) return;
    const current = items.find((i) => i.id === id);
    if (!current) return;

    const data: Record<string, unknown> = { isFavorite };
    let favoriteRank: number | undefined = current.favoriteRank;
    if (!isFavorite) {
      favoriteRank = undefined;
      data.favoriteRank = deleteField();
    } else if (favoriteRank == null) {
      favoriteRank = nextFavoriteRank(items, current.type);
      if (favoriteRank !== undefined) data.favoriteRank = favoriteRank;
    }

    await updateDoc(doc(catalogRef(uid), id), data);
    syncFavoriteSnapshot(uid, { ...current, isFavorite, favoriteRank });
  }

  // Swaps this item's rank with its neighbor among ranked favorites of the
  // same type. No-op past the ends of the list or on unranked items.
  async function moveFavoriteRank(id: string, direction: "up" | "down") {
    if (!uid) return;
    const current = items.find((i) => i.id === id);
    if (!current || !current.isFavorite || current.favoriteRank == null) return;

    const siblings = items
      .filter((i) => i.isFavorite && i.type === current.type && i.favoriteRank != null)
      .sort((a, b) => (a.favoriteRank as number) - (b.favoriteRank as number));
    const idx = siblings.findIndex((i) => i.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const other = siblings[swapIdx];

    const currentRank = current.favoriteRank;
    const otherRank = other.favoriteRank as number;

    const batch = writeBatch(db);
    batch.update(doc(catalogRef(uid), current.id), { favoriteRank: otherRank });
    batch.update(doc(catalogRef(uid), other.id), { favoriteRank: currentRank });
    await batch.commit();

    syncFavoriteSnapshot(uid, { ...current, favoriteRank: otherRank });
    syncFavoriteSnapshot(uid, { ...other, favoriteRank: currentRank });
  }

  async function deleteItem(id: string) {
    if (!uid) return;
    await deleteDoc(doc(catalogRef(uid), id));
    deleteDoc(doc(favoritesRef(uid), id)).catch(() => {});
  }

  async function restoreItems(itemsToRestore: MediaItem[]) {
    if (!uid) return;
    const chunks: MediaItem[][] = [];
    for (let i = 0; i < itemsToRestore.length; i += 400) {
      chunks.push(itemsToRestore.slice(i, i + 400));
    }
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      for (const item of chunk) {
        const { id, ...data } = item;
        batch.set(doc(catalogRef(uid), id), data);
      }
      await batch.commit();
    }
    for (const item of itemsToRestore) syncFavoriteSnapshot(uid, item);
  }

  return {
    items,
    loading,
    saveItem,
    updateStatus,
    updateRating,
    updateProgress,
    toggleFavorite,
    moveFavoriteRank,
    deleteItem,
    restoreItems,
  };
}
