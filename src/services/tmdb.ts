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

export async function getRecommendationsByGenres(
  genreIds: number[],
  mediaType: "movie" | "tv" = "movie"
): Promise<TMDBMovie[]> {
  if (genreIds.length === 0) return [];

  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/discover/${mediaType}`, {
    with_genres: genreIds.join(","),
    sort_by: "popularity.desc",
  });
  return withMediaType(data.results, mediaType);
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
