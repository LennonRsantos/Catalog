import { useCallback, useEffect, useRef, useState } from "react";
import { discoverMedia, type DiscoverOptions, type TmdbMovie } from "../services/tmdb";
import type { MediaType } from "../types";

type TmdbMediaItem = TmdbMovie & { media_type: "movie" | "tv" };

function sortKey(item: TmdbMediaItem, sort: DiscoverOptions["sort"]): number {
  if (sort === "rating") return item.vote_average;
  if (sort === "newest") return Date.parse(item.release_date ?? item.first_air_date ?? "") || 0;
  return 0; // popularity: keep TMDB's order, interleaved below
}

/**
 * Paged /discover results for the Explorar filters. "Todos" fetches the same
 * page for movies and series and merges them, so "Carregar mais" advances both.
 */
export function useDiscover(
  enabled: boolean,
  typeFilter: MediaType | "Todos",
  genreIds: number[],
  options: DiscoverOptions
) {
  const [items, setItems] = useState<TmdbMediaItem[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  const types: ("movie" | "tv")[] =
    typeFilter === "Filme" ? ["movie"] : typeFilter === "Série" ? ["tv"] : ["movie", "tv"];
  // Stable string so the effect reruns only when a filter really changes.
  const key = JSON.stringify([types, genreIds, options.sort, options.yearFrom, options.yearTo, options.minRating]);

  const fetchPage = useCallback(
    async (pageNumber: number) => {
      const pages = await Promise.all(types.map((t) => discoverMedia(t, genreIds, options, pageNumber)));
      let merged: TmdbMediaItem[];
      if (pages.length === 1) {
        merged = pages[0].results;
      } else if (options.sort === "popularity") {
        merged = [];
        const [a, b] = pages.map((p) => p.results);
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
          if (a[i]) merged.push(a[i]);
          if (b[i]) merged.push(b[i]);
        }
      } else {
        merged = pages
          .flatMap((p) => p.results)
          .sort((x, y) => sortKey(y, options.sort) - sortKey(x, options.sort));
      }
      return {
        merged,
        total: pages.reduce((sum, p) => sum + p.totalResults, 0),
        more: pages.some((p) => pageNumber < p.totalPages),
      };
    },
    // `key` captures types, genreIds and options by value.
    [key]
  );

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setTotalResults(0);
      setHasMore(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    setError(false);
    setPage(1);
    const handle = setTimeout(() => {
      fetchPage(1)
        .then(({ merged, total, more }) => {
          if (id !== requestId.current) return;
          setItems(merged);
          setTotalResults(total);
          setHasMore(more);
        })
        .catch(() => {
          if (id !== requestId.current) return;
          setItems([]);
          setTotalResults(0);
          setHasMore(false);
          setError(true);
        })
        .finally(() => {
          if (id === requestId.current) setLoading(false);
        });
    }, 250); // debounce year typing / slider dragging
    return () => clearTimeout(handle);
  }, [enabled, fetchPage]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    const id = requestId.current;
    const next = page + 1;
    setLoadingMore(true);
    try {
      const { merged, more } = await fetchPage(next);
      if (id !== requestId.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((i) => `${i.media_type}-${i.id}`));
        return [...prev, ...merged.filter((i) => !seen.has(`${i.media_type}-${i.id}`))];
      });
      setPage(next);
      setHasMore(more);
    } catch {
      // Keep what is on screen; the button stays so the user can retry.
    } finally {
      setLoadingMore(false);
    }
  }

  return { items, totalResults, loading, loadingMore, hasMore, error, loadMore };
}
