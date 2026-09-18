import { useState } from "react";
import { Check, Clapperboard, MoreVertical, Pencil, Play, Star, Trash2, Tv } from "lucide-react";
import type { MediaItem, MediaStatus } from "../types";
import { DEFAULT_COVER } from "../types";
import { useEscapeClose } from "../hooks/useEscapeClose";
import { formatWatchedTime } from "../utils/time";

function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours <= 0) return `${minutes}min`;
  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
}

interface ResumeSessionCardProps {
  item: MediaItem;
  genreName: string | null;
  onContinue: (item: MediaItem) => void;
  onStatusChange: (id: string, status: MediaStatus) => void;
  onDelete: (id: string) => void;
}

export function ResumeSessionCard({
  item,
  genreName,
  onContinue,
  onStatusChange,
  onDelete,
}: ResumeSessionCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEscapeClose(() => setMenuOpen(false), menuOpen);

  const hasMovieProgress =
    item.type === "Filme" && Boolean(item.runtimeMinutes) && Boolean(item.progressMinutes);
  const watchedSeconds = (item.progressMinutes ?? 0) * 60 + (item.progressSeconds ?? 0);
  const percent = hasMovieProgress
    ? Math.min(100, Math.round((watchedSeconds / ((item.runtimeMinutes ?? 1) * 60)) * 100))
    : null;
  const remaining =
    hasMovieProgress && item.runtimeMinutes
      ? Math.max(0, item.runtimeMinutes - (item.progressMinutes ?? 0))
      : null;

  const episodeLabel =
    item.type === "Série" && (item.progressSeason || item.progressMinutes || item.progressSeconds)
      ? [
          item.progressSeason
            ? `T${item.progressSeason}${item.progressEpisode ? `E${item.progressEpisode}` : ""}`
            : null,
          item.progressMinutes || item.progressSeconds
            ? formatWatchedTime(item.progressMinutes, item.progressSeconds)
            : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-stone-800 bg-stone-900">
      <div className="absolute inset-0">
        <img
          src={item.coverUrl}
          alt=""
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = DEFAULT_COVER;
          }}
          className="h-full w-full object-cover opacity-25 blur-[1px]"
        />
        <div className="absolute inset-0 bg-linear-to-r from-stone-950 via-stone-950/85 to-stone-950/40" />
      </div>

      <div className="relative flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#a32638] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            Retomar Sessão
          </span>
          <span className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-stone-300 backdrop-blur">
            {item.type === "Filme" ? <Clapperboard size={11} /> : <Tv size={11} />}
            {item.type}
            {genreName ? ` • ${genreName}` : ""}
          </span>
          {item.rating > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-[#d9a441] backdrop-blur">
              <Star size={11} className="fill-[#d9a441]" /> {item.rating}/10 sua nota
            </span>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-white sm:text-2xl">{item.title}</h2>
          {episodeLabel && <p className="mt-1 text-sm text-stone-400">{episodeLabel}</p>}
          {item.review.trim() && (
            <p className="mt-1.5 line-clamp-2 max-w-2xl text-sm text-stone-400">{item.review}</p>
          )}
        </div>

        {hasMovieProgress && (
          <div className="max-w-xl space-y-1.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
              <div className="h-full rounded-full bg-[#a32638]" style={{ width: `${percent}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11px] text-stone-500">
              <span>{formatWatchedTime(item.progressMinutes, item.progressSeconds)} assistidos</span>
              <span>
                Total: {formatMinutes(item.runtimeMinutes ?? 0)}
                {remaining !== null && remaining > 0 ? ` (Restam ${formatMinutes(remaining)})` : ""}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onContinue(item)}
            className="flex items-center gap-2 rounded-lg bg-[#a32638] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#bd3347] active:scale-[0.99]"
          >
            <Play size={16} className="fill-white" /> Continuar Assistindo
          </button>

          <button
            onClick={() => onStatusChange(item.id, "Visto")}
            className="rounded-lg border border-stone-700 bg-black/40 p-2.5 text-stone-300 transition hover:border-stone-600 hover:text-white"
            aria-label="Marcar como concluído"
            title="Marcar como concluído"
          >
            <Check size={16} />
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg border border-stone-700 bg-black/40 p-2.5 text-stone-300 transition hover:border-stone-600 hover:text-white"
              aria-label="Mais opções"
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute left-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-stone-800 bg-stone-900 shadow-xl">
                  <button
                    onClick={() => {
                      onContinue(item);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-200 hover:bg-stone-800"
                  >
                    <Pencil size={12} /> Editar progresso
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
      </div>
    </div>
  );
}
