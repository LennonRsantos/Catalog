import { useEffect, useState } from "react";
import { Clapperboard, Loader2, Plus, Star, Tv, User as UserIcon, X } from "lucide-react";
import {
  getBackdropUrl,
  getDetails,
  getPosterUrl,
  getProfileUrl,
  getProviderLogoUrl,
  type MediaDetails,
  type TmdbMovie,
} from "../services/tmdb";
import type { MediaItem } from "../types";
import { DEFAULT_COVER } from "../types";
import { useEscapeClose } from "../hooks/useEscapeClose";

export interface DetailsTarget {
  tmdbId: number;
  mediaType: "movie" | "tv";
}

interface MediaDetailsModalProps {
  target: DetailsTarget | null;
  onClose: () => void;
  onQuickAdd: (item: TmdbMovie) => void;
  catalogItem?: MediaItem | null;
}

function formatRuntime(details: MediaDetails): string | null {
  if (details.media_type === "movie" && details.runtime) {
    const hours = Math.floor(details.runtime / 60);
    const minutes = details.runtime % 60;
    return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
  }
  if (details.media_type === "tv") {
    if (details.number_of_seasons) {
      return `${details.number_of_seasons} temporada${details.number_of_seasons > 1 ? "s" : ""}`;
    }
    if (details.episode_run_time?.[0]) {
      return `~${details.episode_run_time[0]}min/ep`;
    }
  }
  return null;
}

export function MediaDetailsModal({ target, onClose, onQuickAdd, catalogItem }: MediaDetailsModalProps) {
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setDetails(null);
    setError(null);
    setLoading(true);

    getDetails(target.tmdbId, target.mediaType)
      .then((result) => {
        if (!cancelled) setDetails(result);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar os detalhes.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [target]);

  useEscapeClose(onClose, Boolean(target));
  if (!target) return null;

  const title = details?.title ?? details?.name ?? "";
  const year = (details?.release_date ?? details?.first_air_date ?? "").slice(0, 4);
  const backdrop = getBackdropUrl(details?.backdrop_path);
  const poster = getPosterUrl(details?.poster_path) ?? DEFAULT_COVER;
  const runtime = details ? formatRuntime(details) : null;
  const cast = details?.credits?.cast.slice(0, 12) ?? [];
  const providers = details?.["watch/providers"]?.results?.BR;
  const streamingProviders = providers?.flatrate ?? [];

  function handleQuickAddClick() {
    if (!details) return;
    onQuickAdd({
      id: details.id,
      title: details.title,
      name: details.name,
      poster_path: details.poster_path,
      vote_average: details.vote_average,
      release_date: details.release_date,
      first_air_date: details.first_air_date,
      media_type: details.media_type,
      genre_ids: details.genres.map((g) => g.id),
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-2xl border border-stone-800 bg-stone-900 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-56 w-full overflow-hidden bg-stone-950 sm:h-72">
          {backdrop && <img src={backdrop} alt="" className="h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-linear-to-t from-stone-900 via-stone-900/50 to-transparent" />

          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-black/70 p-1.5 text-white backdrop-blur transition hover:bg-black/90"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>

          <div className="absolute bottom-0 left-0 flex w-full items-end gap-4 p-4 sm:p-6">
            <img
              src={poster}
              alt={title}
              className="hidden h-32 w-20 shrink-0 rounded-lg border border-stone-700 object-cover shadow-xl sm:block"
            />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-white sm:text-2xl">
                {loading ? "Carregando…" : title}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-300 sm:text-sm">
                {year && <span>{year}</span>}
                {runtime && <span>{runtime}</span>}
                {details && details.vote_average > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-yellow-400">
                    <Star size={13} className="fill-yellow-400" />
                    {details.vote_average.toFixed(1)}
                  </span>
                )}
                <span className="flex items-center gap-1 text-stone-400">
                  {target.mediaType === "movie" ? <Clapperboard size={12} /> : <Tv size={12} />}
                  {target.mediaType === "movie" ? "Filme" : "Série"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          {loading && (
            <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
              <Loader2 className="animate-spin" size={18} /> Carregando detalhes…
            </div>
          )}

          {error && <p className="py-6 text-sm text-[#d97a86]" aria-live="polite">{error}</p>}

          {details && (
            <>
              {details.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {details.genres.map((genre) => (
                    <span
                      key={genre.id}
                      className="rounded-full border border-stone-800 bg-stone-950 px-2.5 py-1 text-[11px] text-stone-300"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}

              {details.tagline && (
                <p className="text-sm italic text-stone-400">"{details.tagline}"</p>
              )}

              <div>
                <h3 className="mb-1.5 text-sm font-semibold text-white">Sinopse</h3>
                <p className="text-sm leading-relaxed text-stone-400">
                  {details.overview || "Sinopse não disponível."}
                </p>
              </div>

              {cast.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-white">Elenco</h3>
                  <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
                    {cast.map((member) => {
                      const photo = getProfileUrl(member.profile_path);
                      return (
                        <div key={member.id} className="w-16 shrink-0 text-center">
                          <div className="mx-auto mb-1 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-stone-800 bg-stone-950">
                            {photo ? (
                              <img src={photo} alt={member.name} loading="lazy" className="h-full w-full object-cover" />
                            ) : (
                              <UserIcon size={22} className="text-stone-700" />
                            )}
                          </div>
                          <p className="truncate text-[11px] font-medium text-stone-300" title={member.name}>
                            {member.name}
                          </p>
                          <p className="truncate text-[10px] text-stone-600" title={member.character}>
                            {member.character}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h3 className="mb-2 text-sm font-semibold text-white">Onde Assistir</h3>
                {streamingProviders.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {streamingProviders.map((provider) => {
                      const logo = getProviderLogoUrl(provider.logo_path);
                      return (
                        <div
                          key={provider.provider_id}
                          title={provider.provider_name}
                          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-stone-800 bg-stone-950"
                        >
                          {logo && <img src={logo} alt={provider.provider_name} className="h-full w-full object-cover" />}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-stone-500">
                    Não disponível em streaming no Brasil no momento.
                  </p>
                )}
              </div>

              <div className="pt-2">
                {catalogItem ? (
                  <div className="rounded-lg border border-stone-800 bg-stone-950 px-4 py-3 text-sm text-stone-300">
                    Já está na sua lista —{" "}
                    <span className="font-semibold text-white">{catalogItem.status}</span>
                  </div>
                ) : (
                  <button
                    onClick={handleQuickAddClick}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#a32638] py-3 text-sm font-semibold text-white transition hover:bg-[#bd3347] active:scale-[0.99]"
                  >
                    <Plus size={16} /> Adicionar à Lista
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
