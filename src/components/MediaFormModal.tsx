import { useEffect, useState } from "react";
import { Clapperboard, Heart, Tv, X } from "lucide-react";
import type { MediaItem, MediaStatus, MediaType } from "../types";
import { DEFAULT_COVER, MEDIA_STATUSES, MEDIA_TYPES } from "../types";
import { StarRating } from "./StarRating";
import { useEscapeClose } from "../hooks/useEscapeClose";
import { generateId } from "../utils/id";

export interface MediaSeed {
  title: string;
  type: MediaType;
  coverUrl: string;
  tmdbId?: number;
  genreIds?: number[];
}

interface MediaFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (item: MediaItem) => void;
  initialItem?: MediaItem | null;
  seed?: MediaSeed | null;
}

function emptyDraft(): Omit<MediaItem, "id" | "createdAt"> {
  return {
    title: "",
    type: "Filme",
    status: "Quero Ver",
    rating: 0,
    review: "",
    coverUrl: "",
    isFavorite: false,
  };
}

export function MediaFormModal({ open, onClose, onSave, initialItem, seed }: MediaFormModalProps) {
  const [draft, setDraft] = useState(emptyDraft());

  useEffect(() => {
    if (open) {
      if (initialItem) {
        setDraft({
          title: initialItem.title,
          type: initialItem.type,
          status: initialItem.status,
          rating: initialItem.rating,
          review: initialItem.review,
          coverUrl: initialItem.coverUrl,
          tmdbId: initialItem.tmdbId,
          genreIds: initialItem.genreIds,
          runtimeMinutes: initialItem.runtimeMinutes,
          progressSeason: initialItem.progressSeason,
          progressMinutes: initialItem.progressMinutes,
          progressSeconds: initialItem.progressSeconds,
          isFavorite: initialItem.isFavorite ?? false,
          favoriteRank: initialItem.favoriteRank,
        });
      } else if (seed) {
        setDraft({ ...emptyDraft(), ...seed });
      } else {
        setDraft(emptyDraft());
      }
    }
  }, [open, initialItem, seed]);

  useEscapeClose(onClose, open);
  if (!open) return null;

  const isEditing = Boolean(initialItem);
  const identityLocked = Boolean(initialItem) || Boolean(seed);
  const canRate = draft.status === "Visto";
  const isWatching = draft.status === "Assistindo";

  const progressHours = Math.floor((draft.progressMinutes ?? 0) / 60);
  const progressMinutesPart = (draft.progressMinutes ?? 0) % 60;
  const progressSecondsPart = draft.progressSeconds ?? 0;

  function setProgressHours(hours: number) {
    setDraft({ ...draft, progressMinutes: hours * 60 + progressMinutesPart });
  }
  function setProgressMinutesPart(minutes: number) {
    setDraft({ ...draft, progressMinutes: progressHours * 60 + Math.min(59, minutes) });
  }
  function setProgressSecondsPart(seconds: number) {
    setDraft({ ...draft, progressSeconds: Math.min(59, seconds) });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) return;

    onSave({
      id: initialItem?.id ?? generateId(),
      createdAt: initialItem?.createdAt ?? Date.now(),
      ...draft,
      title: draft.title.trim(),
      coverUrl: draft.coverUrl.trim() || DEFAULT_COVER,
      rating: canRate ? draft.rating : 0,
      review: canRate ? draft.review : "",
      progressSeason: isWatching && draft.type === "Série" ? draft.progressSeason : undefined,
      progressMinutes: isWatching ? draft.progressMinutes : undefined,
      progressSeconds: isWatching ? draft.progressSeconds : undefined,
      favoriteRank: draft.isFavorite ? draft.favoriteRank : undefined,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl border border-stone-800 bg-stone-900 p-6 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {isEditing ? "Editar Mídia" : "Nova Mídia"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-800 hover:text-white"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {identityLocked ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-400">
                Título
              </label>
              <p className="rounded-lg bg-stone-950 px-3 py-2.5 text-sm text-white">{draft.title}</p>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-400">
                Título
              </label>
              <input
                autoFocus
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Ex: Duna: Parte Dois"
                className="w-full rounded-lg bg-stone-950 px-3 py-2.5 text-sm text-white placeholder-stone-600 outline-none focus:ring-2 focus:ring-[#a32638]"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-400">
                Tipo
              </label>
              {identityLocked ? (
                <span className="flex w-fit items-center gap-1.5 rounded-full bg-stone-950 px-3 py-2 text-xs font-medium text-stone-300">
                  {draft.type === "Filme" ? <Clapperboard size={12} /> : <Tv size={12} />}
                  {draft.type}
                </span>
              ) : (
                <div className="flex overflow-hidden rounded-lg">
                  {MEDIA_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setDraft({ ...draft, type })}
                      className={`flex-1 px-2 py-2 text-xs font-medium transition ${
                        draft.type === type
                          ? "bg-[#a32638] text-white"
                          : "bg-stone-950 text-stone-400 hover:text-white"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-400">
                Status
              </label>
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as MediaStatus })}
                className="w-full rounded-lg bg-stone-950 px-3 py-2.5 text-xs font-medium text-white outline-none focus:ring-2 focus:ring-[#a32638]"
              >
                {MEDIA_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDraft({ ...draft, isFavorite: !draft.isFavorite })}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              draft.isFavorite
                ? "bg-[#d9a441]/15 text-[#d9a441] ring-1 ring-[#d9a441]/40"
                : "bg-stone-950 text-stone-400 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <Heart size={16} className={draft.isFavorite ? "fill-[#d9a441] text-[#d9a441]" : ""} />
              Marcar como favorito
            </span>
            {draft.isFavorite && draft.favoriteRank && (
              <span className="text-xs text-[#d9a441]">{draft.favoriteRank}º no Top 10</span>
            )}
          </button>

          {isWatching && (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-400">
                Onde Parou
              </label>
              <div className="space-y-2">
                {draft.type === "Série" && (
                  <input
                    type="number"
                    min={0}
                    value={draft.progressSeason ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        progressSeason: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="Temporada"
                    className="w-full rounded-lg bg-stone-950 px-3 py-2.5 text-sm text-white placeholder-stone-600 outline-none focus:ring-2 focus:ring-[#a32638]"
                  />
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <input
                      type="number"
                      min={0}
                      value={progressHours || ""}
                      onChange={(e) => setProgressHours(e.target.value ? Number(e.target.value) : 0)}
                      placeholder="Horas"
                      className="w-full rounded-lg bg-stone-950 px-3 py-2.5 text-sm text-white placeholder-stone-600 outline-none focus:ring-2 focus:ring-[#a32638]"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={progressMinutesPart || ""}
                      onChange={(e) => setProgressMinutesPart(e.target.value ? Number(e.target.value) : 0)}
                      placeholder="Minutos"
                      className="w-full rounded-lg bg-stone-950 px-3 py-2.5 text-sm text-white placeholder-stone-600 outline-none focus:ring-2 focus:ring-[#a32638]"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={progressSecondsPart || ""}
                      onChange={(e) => setProgressSecondsPart(e.target.value ? Number(e.target.value) : 0)}
                      placeholder="Segundos"
                      className="w-full rounded-lg bg-stone-950 px-3 py-2.5 text-sm text-white placeholder-stone-600 outline-none focus:ring-2 focus:ring-[#a32638]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {canRate ? (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-400">
                  Nota
                </label>
                <StarRating
                  value={draft.rating}
                  onChange={(rating) => setDraft({ ...draft, rating })}
                  size={26}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-400">
                  Comentário
                </label>
                <textarea
                  value={draft.review}
                  onChange={(e) => setDraft({ ...draft, review: e.target.value })}
                  placeholder="O que você achou? (opcional)"
                  rows={3}
                  className="w-full resize-none rounded-lg bg-stone-950 px-3 py-2.5 text-sm text-white placeholder-stone-600 outline-none focus:ring-2 focus:ring-[#a32638]"
                />
              </div>
            </>
          ) : (
            <p className="rounded-lg bg-stone-950 px-3 py-2.5 text-xs text-stone-500">
              Marque como "Visto" para avaliar e comentar.
            </p>
          )}

          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-[#a32638] py-3 text-sm font-semibold text-white transition hover:bg-[#bd3347] active:scale-[0.99]"
          >
            {isEditing ? "Salvar Alterações" : "Adicionar à Lista"}
          </button>
        </form>
      </div>
    </div>
  );
}
