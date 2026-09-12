import { Clapperboard, Plus, Star, Tv } from "lucide-react";
import type { TmdbMovie } from "../services/tmdb";
import { getPosterUrl } from "../services/tmdb";
import { DEFAULT_COVER } from "../types";

interface TmdbResultCardProps {
  item: TmdbMovie & { media_type: "movie" | "tv" };
  onAdd: (item: TmdbMovie) => void;
  onOpenDetails?: (item: TmdbMovie & { media_type: "movie" | "tv" }) => void;
}

export function TmdbResultCard({ item, onAdd, onOpenDetails }: TmdbResultCardProps) {
  const title = item.title ?? item.name ?? "Sem título";
  const year = (item.release_date ?? item.first_air_date ?? "").slice(0, 4);
  const poster = getPosterUrl(item.poster_path) ?? DEFAULT_COVER;

  return (
    <div
      onClick={() => onOpenDetails?.(item)}
      onKeyDown={(e) => {
        if (onOpenDetails && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpenDetails(item);
        }
      }}
      role={onOpenDetails ? "button" : undefined}
      tabIndex={onOpenDetails ? 0 : undefined}
      className={`group relative shrink-0 overflow-hidden rounded-xl border border-stone-800 bg-stone-900/60 transition hover:border-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a32638] ${
        onOpenDetails ? "cursor-pointer" : ""
      }`}
    >
      <div className="relative aspect-2/3 w-full overflow-hidden bg-stone-950">
        <img
          src={poster}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />

        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
          {item.media_type === "movie" ? <Clapperboard size={11} /> : <Tv size={11} />}
          {item.media_type === "movie" ? "Filme" : "Série"}
        </span>

        {item.vote_average > 0 && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
            <Star size={10} className="fill-yellow-400 text-yellow-400" />
            {item.vote_average.toFixed(1)}
          </span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd(item);
          }}
          className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-[#a32638] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg transition hover:bg-[#bd3347] active:scale-95"
          aria-label={`Adicionar ${title}`}
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="p-3">
        <h3 className="truncate text-sm font-semibold text-white" title={title}>
          {title}
        </h3>
        {year && <p className="text-xs text-stone-500">{year}</p>}
      </div>
    </div>
  );
}
