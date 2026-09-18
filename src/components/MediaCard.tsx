import { useState } from "react";
import {
  Clapperboard,
  Heart,
  MessageSquare,
  MoreVertical,
  Pencil,
  PlayCircle,
  Trash2,
  Tv,
} from "lucide-react";
import type { MediaItem, MediaStatus } from "../types";
import { DEFAULT_COVER, MEDIA_STATUSES } from "../types";
import { StarRating } from "./StarRating";
import { useEscapeClose } from "../hooks/useEscapeClose";
import { formatWatchedTime } from "../utils/time";

function formatProgress(item: MediaItem): string | null {
  const hasTime = Boolean(item.progressMinutes || item.progressSeconds);

  if (item.type === "Série") {
    const time = hasTime ? formatWatchedTime(item.progressMinutes, item.progressSeconds) : null;
    const seasonEpisode = item.progressSeason
      ? `T${item.progressSeason}${item.progressEpisode ? `E${item.progressEpisode}` : ""}`
      : null;
    if (seasonEpisode && time) return `${seasonEpisode} · ${time}`;
    if (seasonEpisode) return seasonEpisode;
    return time;
  }

  return hasTime ? `${formatWatchedTime(item.progressMinutes, item.progressSeconds)} assistidos` : null;
}

interface MediaCardProps {
  item: MediaItem;
  onStatusChange: (id: string, status: MediaStatus) => void;
  onRatingChange?: (id: string, rating: number) => void;
  onEdit: (item: MediaItem) => void;
  onDelete: (id: string) => void;
  onOpenDetails?: (item: MediaItem) => void;
  onToggleFavorite?: (id: string, isFavorite: boolean) => void;
}

export function MediaCard({
  item,
  onStatusChange,
  onRatingChange,
  onEdit,
  onDelete,
  onOpenDetails,
  onToggleFavorite,
}: MediaCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEscapeClose(() => setMenuOpen(false), menuOpen);
  const canOpenDetails = Boolean(onOpenDetails && item.tmdbId);
  const progressLabel = item.status === "Assistindo" ? formatProgress(item) : null;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-stone-800 bg-stone-900/60 transition hover:border-stone-600">
      <div className="relative aspect-2/3 w-full overflow-hidden bg-stone-950">
        <img
          src={item.coverUrl}
          alt={item.title}
          loading="lazy"
          onClick={() => canOpenDetails && onOpenDetails?.(item)}
          onKeyDown={(e) => {
            if (canOpenDetails && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onOpenDetails?.(item);
            }
          }}
          role={canOpenDetails ? "button" : undefined}
          tabIndex={canOpenDetails ? 0 : undefined}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = DEFAULT_COVER;
          }}
          className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${
            canOpenDetails ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a32638]" : ""
          }`}
        />

        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
          {item.type === "Filme" ? <Clapperboard size={11} /> : <Tv size={11} />}
          {item.type}
        </span>

        {item.isFavorite && item.favoriteRank && (
          <span className="absolute bottom-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#d9a441] text-[11px] font-bold text-stone-950">
            {item.favoriteRank}º
          </span>
        )}

        <div className="absolute right-2 top-2 flex items-center gap-1.5">
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(item.id, !item.isFavorite)}
              className="rounded-full bg-black/70 p-1.5 text-white backdrop-blur transition hover:bg-black/90"
              aria-label={item.isFavorite ? "Remover dos favoritos" : "Marcar como favorito"}
            >
              <Heart size={14} className={item.isFavorite ? "fill-[#d9a441] text-[#d9a441]" : ""} />
            </button>
          )}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full bg-black/70 p-1.5 text-white backdrop-blur transition hover:bg-black/90"
            aria-label="Opções"
          >
            <MoreVertical size={14} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-lg border border-stone-800 bg-stone-900 shadow-xl">
                <button
                  onClick={() => {
                    onEdit(item);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-200 hover:bg-stone-800"
                >
                  <Pencil size={12} /> Editar
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    if (window.confirm(`Remover "${item.title}" da sua lista?`)) onDelete(item.id);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#bd3347] hover:bg-stone-800"
                >
                  <Trash2 size={12} /> Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2 p-3">
        <h3 className="truncate text-sm font-semibold text-white" title={item.title}>
          {item.title}
        </h3>

        {progressLabel && (
          <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
            <PlayCircle size={12} className="shrink-0 text-[#a32638]" />
            <span className="truncate">{progressLabel}</span>
          </div>
        )}

        {item.status === "Visto" && (
          <div className="flex items-center gap-2">
            <StarRating
              value={item.rating}
              size={13}
              onChange={onRatingChange ? (rating) => onRatingChange(item.id, rating) : undefined}
            />
            {item.review.trim() && (
              <span title={item.review}>
                <MessageSquare size={12} className="shrink-0 text-stone-600" aria-label="Tem comentário" />
              </span>
            )}
          </div>
        )}

        <select
          value={item.status}
          onChange={(e) => onStatusChange(item.id, e.target.value as MediaStatus)}
          className="w-full rounded-md border border-stone-800 bg-stone-950 px-2 py-1.5 text-[11px] font-medium text-stone-300 outline-none focus:border-[#a32638]"
        >
          {MEDIA_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
