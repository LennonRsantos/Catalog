import { Loader2, Sparkles, X } from "lucide-react";
import { useEscapeClose } from "../hooks/useEscapeClose";
import type { Genre, User } from "../types";

interface GenrePreferencesModalProps {
  open: boolean;
  onClose: () => void;
  profile: User;
  genres: Genre[];
  genresLoading: boolean;
  onSave: (user: User) => void;
}

export function GenrePreferencesModal({
  open,
  onClose,
  profile,
  genres,
  genresLoading,
  onSave,
}: GenrePreferencesModalProps) {
  useEscapeClose(onClose, open);
  if (!open) return null;

  function toggleGenre(id: number) {
    const current = profile.favoriteGenreIds;
    const next = current.includes(id) ? current.filter((g) => g !== id) : [...current, id];
    onSave({ ...profile, favoriteGenreIds: next });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-stone-800 bg-stone-900 p-6 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Sparkles size={18} className="text-[#a32638]" /> Gêneros Favoritos
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-800 hover:text-white"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <p className="mb-4 text-xs text-stone-500">
          Usado para montar suas recomendações. Toque para marcar ou desmarcar — salva na hora.
        </p>

        {genresLoading ? (
          <div className="flex items-center gap-2 py-6 text-xs text-stone-500">
            <Loader2 className="animate-spin" size={14} /> Carregando gêneros…
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => {
              const selected = profile.favoriteGenreIds.includes(genre.id);
              return (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => toggleGenre(genre.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    selected
                      ? "border-[#a32638] bg-[#a32638] text-white"
                      : "border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700 hover:text-white"
                  }`}
                >
                  {genre.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
