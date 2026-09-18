import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import type { MediaItem, MediaStatus, MediaType } from "../types";
import type { Tables, TablesUpdate } from "../services/database.types";

type CatalogRow = Tables<"catalog_items">;

function rowToItem(row: CatalogRow): MediaItem {
  return {
    id: row.id,
    tmdbId: row.tmdb_id ?? undefined,
    title: row.title,
    type: row.type as MediaType,
    status: row.status as MediaStatus,
    rating: Number(row.rating),
    review: row.review,
    coverUrl: row.cover_url,
    createdAt: new Date(row.created_at).getTime(),
    genreIds: row.genre_ids ?? undefined,
    runtimeMinutes: row.runtime_minutes ?? undefined,
    progressSeason: row.progress_season ?? undefined,
    progressEpisode: row.progress_episode ?? undefined,
    progressMinutes: row.progress_minutes ?? undefined,
    progressSeconds: row.progress_seconds ?? undefined,
    isFavorite: row.is_favorite,
    favoriteRank: row.favorite_rank ?? undefined,
  };
}

function itemToRow(uid: string, item: MediaItem) {
  return {
    id: item.id,
    owner_uid: uid,
    tmdb_id: item.tmdbId ?? null,
    title: item.title,
    type: item.type,
    status: item.status,
    rating: item.rating,
    review: item.review,
    cover_url: item.coverUrl,
    created_at: new Date(item.createdAt).toISOString(),
    genre_ids: item.genreIds ?? null,
    runtime_minutes: item.runtimeMinutes ?? null,
    progress_season: item.progressSeason ?? null,
    progress_episode: item.progressEpisode ?? null,
    progress_minutes: item.progressMinutes ?? null,
    progress_seconds: item.progressSeconds ?? null,
    is_favorite: item.isFavorite ?? false,
    favorite_rank: item.favoriteRank ?? null,
  };
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
    let cancelled = false;

    async function refetch() {
      const { data, error } = await supabase
        .from("catalog_items")
        .select("*")
        .eq("owner_uid", uid as string)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error("Falha ao carregar catálogo:", error);
      } else {
        setItems((data ?? []).map(rowToItem));
      }
      setLoading(false);
    }

    refetch();

    // Resyncs the full list on any change rather than patching incrementally
    // — simpler to get right, and cheap at this app's catalog sizes (same
    // trade-off the rest of the app already makes elsewhere).
    const channel = supabase
      .channel(`catalog:${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "catalog_items", filter: `owner_uid=eq.${uid}` },
        () => refetch()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [uid]);

  async function saveItem(item: MediaItem) {
    if (!uid) return;
    let finalItem = item;
    if (item.isFavorite && item.favoriteRank == null) {
      const rank = nextFavoriteRank(items, item.type);
      if (rank !== undefined) finalItem = { ...item, favoriteRank: rank };
    }
    const { error } = await supabase.from("catalog_items").upsert(itemToRow(uid, finalItem));
    if (error) throw error;
  }

  async function updateStatus(id: string, status: MediaStatus) {
    if (!uid) return;
    const patch: TablesUpdate<"catalog_items"> = { status };
    if (status !== "Visto") {
      patch.rating = 0;
      patch.review = "";
    }
    if (status !== "Assistindo") {
      patch.progress_season = null;
      patch.progress_episode = null;
      patch.progress_minutes = null;
      patch.progress_seconds = null;
    }
    const { error } = await supabase.from("catalog_items").update(patch).eq("id", id).eq("owner_uid", uid);
    if (error) throw error;
  }

  async function updateRating(id: string, rating: number) {
    if (!uid) return;
    const { error } = await supabase.from("catalog_items").update({ rating }).eq("id", id).eq("owner_uid", uid);
    if (error) throw error;
  }

  async function updateProgress(
    id: string,
    progress: { progressSeason?: number; progressEpisode?: number; progressMinutes?: number; progressSeconds?: number }
  ) {
    if (!uid) return;
    const { error } = await supabase
      .from("catalog_items")
      .update({
        progress_season: progress.progressSeason ?? null,
        progress_episode: progress.progressEpisode ?? null,
        progress_minutes: progress.progressMinutes ?? null,
        progress_seconds: progress.progressSeconds ?? null,
      })
      .eq("id", id)
      .eq("owner_uid", uid);
    if (error) throw error;
  }

  // Explicit favorite toggle, independent of status/rating. Turning on
  // auto-assigns the next free 1-10 rank for that type; turning off clears it.
  async function toggleFavorite(id: string, isFavorite: boolean) {
    if (!uid) return;
    const current = items.find((i) => i.id === id);
    if (!current) return;

    let favoriteRank: number | null = current.favoriteRank ?? null;
    if (!isFavorite) {
      favoriteRank = null;
    } else if (favoriteRank == null) {
      favoriteRank = nextFavoriteRank(items, current.type) ?? null;
    }

    const { error } = await supabase
      .from("catalog_items")
      .update({ is_favorite: isFavorite, favorite_rank: favoriteRank })
      .eq("id", id)
      .eq("owner_uid", uid);
    if (error) throw error;
  }

  // Swaps this item's rank with its neighbor among ranked favorites of the
  // same type. No-op past the ends of the list or on unranked items. The two
  // updates aren't wrapped in a single transaction (a brief inconsistent
  // rank pair on a dropped connection is a cosmetic, self-healing risk, not
  // a correctness one) — same risk tolerance the rest of this app accepts.
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

    const [r1, r2] = await Promise.all([
      supabase.from("catalog_items").update({ favorite_rank: otherRank }).eq("id", current.id).eq("owner_uid", uid),
      supabase.from("catalog_items").update({ favorite_rank: currentRank }).eq("id", other.id).eq("owner_uid", uid),
    ]);
    if (r1.error) throw r1.error;
    if (r2.error) throw r2.error;
  }

  async function deleteItem(id: string) {
    if (!uid) return;
    const { error } = await supabase.from("catalog_items").delete().eq("id", id).eq("owner_uid", uid);
    if (error) throw error;
  }

  async function restoreItems(itemsToRestore: MediaItem[]) {
    if (!uid) return;
    const rows = itemsToRestore.map((item) => itemToRow(uid, item));
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from("catalog_items").upsert(rows.slice(i, i + 500));
      if (error) throw error;
    }
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
