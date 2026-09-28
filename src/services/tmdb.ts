import type { Genre, TMDBMovie } from "../types";

export type TmdbMovie = TMDBMovie;

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const READ_ACCESS_TOKEN = import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN;

export class TmdbApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "TmdbApiError";
    this.status = status;
  }
}

interface TmdbErrorBody {
  status_message?: string;
  error?: string;
}

async function tmdbFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const searchParams = new URLSearchParams({ language: "pt-BR", ...params });
  const url = `${TMDB_BASE_URL}${path}?${searchParams.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${READ_ACCESS_TOKEN}`,
        Accept: "application/json",
      },
    });
  } catch (err) {
    throw new TmdbApiError(0, err instanceof Error ? err.message : "network_error");
  }

  if (!res.ok) {
    const body: TmdbErrorBody | null = await res.json().catch(() => null);
    throw new TmdbApiError(res.status, body?.status_message ?? body?.error ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

function withMediaType(
  results: TMDBMovie[],
  forcedType?: "movie" | "tv"
): (TMDBMovie & { media_type: "movie" | "tv" })[] {
  return results
    .map((r) => ({ ...r, media_type: r.media_type ?? forcedType }))
    .filter(
      (r): r is TMDBMovie & { media_type: "movie" | "tv" } =>
        r.media_type === "movie" || r.media_type === "tv"
    );
}

export async function getTrending(
  mediaType: "all" | "movie" | "tv" = "all",
  timeWindow: "day" | "week" = "week"
): Promise<TMDBMovie[]> {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/trending/${mediaType}/${timeWindow}`);
  return withMediaType(data.results, mediaType === "all" ? undefined : mediaType);
}

export async function getPopular(mediaType: "movie" | "tv" = "movie"): Promise<TMDBMovie[]> {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/${mediaType}/popular`);
  return withMediaType(data.results, mediaType);
}

export async function searchMulti(query: string): Promise<TMDBMovie[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const data = await tmdbFetch<{ results: TMDBMovie[] }>("/search/multi", {
    query: trimmed,
    include_adult: "false",
  });
  return withMediaType(data.results);
}

export async function getGenres(): Promise<Genre[]> {
  const [movieGenres, tvGenres] = await Promise.all([
    tmdbFetch<{ genres: Genre[] }>("/genre/movie/list"),
    tmdbFetch<{ genres: Genre[] }>("/genre/tv/list"),
  ]);

  const merged = new Map<number, Genre>();
  for (const genre of [...movieGenres.genres, ...tvGenres.genres]) {
    merged.set(genre.id, genre);
  }
  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function getRecommendationsByGenres(
  genreIds: number[],
  mediaType: "movie" | "tv" = "movie"
): Promise<TMDBMovie[]> {
  if (genreIds.length === 0) return [];

  const params = {
    with_genres: genreIds.join("|"), // pipe = OR (any of these genres); comma would require ALL of them
    sort_by: "popularity.desc",
    "vote_count.gte": "50",
    "vote_average.gte": "6",
  };

  const pages = await Promise.all([
    tmdbFetch<{ results: TMDBMovie[] }>(`/discover/${mediaType}`, { ...params, page: "1" }),
    tmdbFetch<{ results: TMDBMovie[] }>(`/discover/${mediaType}`, { ...params, page: "2" }),
  ]);

  const byId = new Map<number, TMDBMovie>();
  for (const page of pages) {
    for (const result of page.results) byId.set(result.id, result);
  }

  return shuffle(withMediaType([...byId.values()], mediaType));
}

export type DiscoverSort = "popularity" | "rating" | "newest";

export interface DiscoverOptions {
  sort: DiscoverSort;
  yearFrom: number | null;
  yearTo: number | null;
  minRating: number; // 0-10, TMDB vote_average scale
  hideOwned: boolean;
}

export const DEFAULT_DISCOVER_OPTIONS: DiscoverOptions = {
  sort: "popularity",
  yearFrom: null,
  yearTo: null,
  minRating: 0,
  hideOwned: false,
};

export interface DiscoverPage {
  results: (TMDBMovie & { media_type: "movie" | "tv" })[];
  totalPages: number;
  totalResults: number;
}

/** One page of /discover for a single media type, with the Explorar filters. */
export async function discoverMedia(
  mediaType: "movie" | "tv",
  genreIds: number[],
  options: DiscoverOptions,
  page: number
): Promise<DiscoverPage> {
  const dateKey = mediaType === "movie" ? "primary_release_date" : "first_air_date";
  const today = new Date().toISOString().slice(0, 10);

  const params: Record<string, string> = {
    page: String(page),
    include_adult: "false",
    sort_by:
      options.sort === "rating"
        ? "vote_average.desc"
        : options.sort === "newest"
          ? `${dateKey}.desc`
          : "popularity.desc",
    // Top-rated with few votes is noise (a 10.0 from 3 people), so that sort
    // demands a real audience; the others just skip near-empty entries.
    "vote_count.gte": options.sort === "rating" ? "300" : "20",
  };
  if (genreIds.length > 0) params.with_genres = genreIds.join("|"); // pipe = OR
  if (options.minRating > 0) params["vote_average.gte"] = String(options.minRating);
  if (options.yearFrom) params[`${dateKey}.gte`] = `${options.yearFrom}-01-01`;
  // "Newest" should not surface announced-but-unreleased titles.
  const upper = options.yearTo ? `${options.yearTo}-12-31` : options.sort === "newest" ? today : null;
  if (upper) params[`${dateKey}.lte`] = upper;

  const data = await tmdbFetch<{ results: TMDBMovie[]; total_pages: number; total_results: number }>(
    `/discover/${mediaType}`,
    params
  );
  return {
    results: withMediaType(data.results, mediaType),
    // TMDB refuses pages past 500.
    totalPages: Math.min(data.total_pages, 500),
    totalResults: data.total_results,
  };
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface WatchProviderEntry {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface WatchProviderRegion {
  link?: string;
  flatrate?: WatchProviderEntry[];
  rent?: WatchProviderEntry[];
  buy?: WatchProviderEntry[];
}

export interface MediaDetails extends TMDBMovie {
  genres: Genre[];
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_seasons?: number;
  tagline?: string;
  credits?: { cast: CastMember[] };
  "watch/providers"?: { results: Record<string, WatchProviderRegion> };
}

export async function getDetails(
  id: number,
  mediaType: "movie" | "tv"
): Promise<MediaDetails> {
  const details = await tmdbFetch<MediaDetails>(`/${mediaType}/${id}`, {
    append_to_response: "credits,watch/providers",
  });
  return { ...details, media_type: mediaType };
}

export function getPosterUrl(path: string | null | undefined, size = "w500"): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

export function getBackdropUrl(path: string | null | undefined, size = "w1280"): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

export function getProfileUrl(path: string | null | undefined, size = "w185"): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

export function getProviderLogoUrl(path: string | null | undefined, size = "w92"): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

export async function testTmdbConnection(): Promise<
  { ok: true; count: number } | { ok: false; error: string }
> {
  try {
    const results = await getTrending();
    return { ok: true, count: results.length };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
