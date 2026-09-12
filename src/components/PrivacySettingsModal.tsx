import { useEffect, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import type { PostVisibility, ProfileVisibility, User } from "../types";
import { resolvePrivacy } from "../types";
import { useEscapeClose } from "../hooks/useEscapeClose";

interface PrivacySettingsModalProps {
  open: boolean;
  onClose: () => void;
  profile: User;
  onSave: (user: User) => void;
}

const PROFILE_OPTIONS: { value: ProfileVisibility; label: string }[] = [
  { value: "public", label: "Público" },
  { value: "friends", label: "Amigos" },
  { value: "private", label: "Privado" },
];

const FEED_OPTIONS: { value: PostVisibility; label: string }[] = [
  { value: "public", label: "Público" },
  { value: "friends", label: "Amigos" },
  { value: "private", label: "Só eu" },
];

export function PrivacySettingsModal({ open, onClose, profile, onSave }: PrivacySettingsModalProps) {
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>("friends");
  const [feedVisibility, setFeedVisibility] = useState<PostVisibility>("friends");
  const [autoShareOnWatched, setAutoShareOnWatched] = useState(false);

  useEffect(() => {
    if (open) {
      const resolved = resolvePrivacy(profile);
      setProfileVisibility(resolved.profileVisibility);
      setFeedVisibility(resolved.feedVisibility);
      setAutoShareOnWatched(resolved.autoShareOnWatched);
    }
  }, [open, profile]);

  useEscapeClose(onClose, open);
  if (!open) return null;

  function handleSave() {
    onSave({ ...profile, profileVisibility, feedVisibility, autoShareOnWatched });
    onClose();
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
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <ShieldCheck size={18} className="text-[#a32638]" /> Privacidade
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-800 hover:text-white"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-400">
              Meu perfil
            </label>
            <p className="mb-2 text-xs text-stone-500">
              Qualquer pessoa pode te encontrar pelo nome ou TAG pra enviar solicitação. Isso só
              controla quem vê suas atividades ao abrir seu perfil.
            </p>
            <div className="flex overflow-hidden rounded-lg border border-stone-800">
              {PROFILE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setProfileVisibility(opt.value)}
                  className={`flex-1 px-2 py-2 text-xs font-medium transition ${
                    profileVisibility === opt.value
                      ? "bg-[#a32638] text-white"
                      : "bg-stone-950 text-stone-400 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-400">
              Minhas atividades
            </label>
            <p className="mb-2 text-xs text-stone-500">
              Quem vê suas avaliações e comentários publicados no feed.
            </p>
            <div className="flex overflow-hidden rounded-lg border border-stone-800">
              {FEED_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFeedVisibility(opt.value)}
                  className={`flex-1 px-2 py-2 text-xs font-medium transition ${
                    feedVisibility === opt.value
                      ? "bg-[#a32638] text-white"
                      : "bg-stone-950 text-stone-400 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAutoShareOnWatched((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-stone-800 bg-stone-950 px-3 py-3 text-left"
          >
            <span>
              <span className="block text-sm font-medium text-white">Compartilhar automaticamente</span>
              <span className="block text-xs text-stone-500">
                {autoShareOnWatched
                  ? "Publica direto ao marcar como visto, sem perguntar."
                  : "Sempre pergunta antes de publicar no feed."}
              </span>
            </span>
            <span
              className={`flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition ${
                autoShareOnWatched ? "justify-end bg-[#a32638]" : "justify-start bg-stone-700"
              }`}
            >
              <span className="h-5 w-5 rounded-full bg-white" />
            </span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-lg bg-[#a32638] py-3 text-sm font-semibold text-white transition hover:bg-[#bd3347] active:scale-[0.99]"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}
