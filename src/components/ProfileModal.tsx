import { useEffect, useState } from "react";
import { Loader2, User as UserIcon, X } from "lucide-react";
import type { Genre, User } from "../types";
import { useEscapeClose } from "../hooks/useEscapeClose";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  initialUser: User | null;
  genres: Genre[];
  genresLoading: boolean;
  dismissible?: boolean;
}

export function ProfileModal({
  open,
  onClose,
  onSave,
  initialUser,
  genres,
  genresLoading,
  dismissible = true,
}: ProfileModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [favoriteGenreIds, setFavoriteGenreIds] = useState<number[]>([]);

  useEffect(() => {
    if (open) {
      setName(initialUser?.name ?? "");
      setEmail(initialUser?.email ?? "");
      setFavoriteGenreIds(initialUser?.favoriteGenreIds ?? []);
    }
  }, [open, initialUser]);

  useEscapeClose(onClose, open && dismissible);
  if (!open) return null;

  function toggleGenre(id: number) {
    setFavoriteGenreIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onSave({
      ...initialUser,
      name: name.trim(),
      email: email.trim(),
      favoriteGenreIds,
      role: initialUser?.role ?? "user",
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={() => dismissible && onClose()}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-stone-800 bg-stone-900 p-6 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <UserIcon size={18} className="text-[#a32638]" />
            {initialUser ? "Editar Perfil" : "Criar Perfil"}
          </h2>
          {dismissible && (
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-800 hover:text-white"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {!initialUser && (
          <p className="mb-4 text-xs text-stone-500">
            Conte um pouco sobre você para recebermos recomendações personalizadas.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-400" htmlFor="profile-name">
              Nome
            </label>
            <input
              id="profile-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              autoComplete="name"
              className="w-full rounded-lg border border-stone-800 bg-stone-950 px-3 py-2.5 text-sm text-white placeholder-stone-600 outline-none focus:border-[#a32638]"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-400" htmlFor="profile-email">
              E-mail
            </label>
            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              autoComplete="email"
              spellCheck={false}
              className="w-full rounded-lg border border-stone-800 bg-stone-950 px-3 py-2.5 text-sm text-white placeholder-stone-600 outline-none focus:border-[#a32638]"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-400">
              Gêneros Favoritos
            </label>

            {genresLoading ? (
              <div className="flex items-center gap-2 py-3 text-xs text-stone-500">
                <Loader2 className="animate-spin" size={14} /> Carregando gêneros…
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => {
                  const selected = favoriteGenreIds.includes(genre.id);
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

          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-[#a32638] py-3 text-sm font-semibold text-white transition hover:bg-[#bd3347] active:scale-[0.99]"
          >
            Salvar Perfil
          </button>
        </form>
      </div>
    </div>
  );
}
