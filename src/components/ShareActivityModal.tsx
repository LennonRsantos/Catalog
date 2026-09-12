import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Share2, X } from "lucide-react";
import type { MediaItem, PostVisibility } from "../types";
import { StarRating } from "./StarRating";
import { useEscapeClose } from "../hooks/useEscapeClose";

const VISIBILITY_OPTIONS: { value: PostVisibility; label: string }[] = [
  { value: "public", label: "Público" },
  { value: "friends", label: "Amigos" },
  { value: "private", label: "Só eu" },
];

interface ShareActivityModalProps {
  item: MediaItem | null;
  defaultVisibility: PostVisibility;
  submitting?: boolean;
  error?: string | null;
  onShare: (rating: number, review: string, visibility: PostVisibility) => void;
  onSkip: () => void;
}

export function ShareActivityModal({
  item,
  defaultVisibility,
  submitting = false,
  error = null,
  onShare,
  onSkip,
}: ShareActivityModalProps) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>(defaultVisibility);

  useEffect(() => {
    if (item) {
      setRating(item.rating);
      setReview(item.review);
      setVisibility(defaultVisibility);
    }
  }, [item, defaultVisibility]);

  useEscapeClose(onSkip, Boolean(item));
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onSkip}
    >
      <div
        className="w-full max-w-md rounded-t-2xl border border-stone-800 bg-stone-900 p-6 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Share2 size={18} className="text-[#a32638]" /> Compartilhar no Feed
          </h2>
          <button
            onClick={onSkip}
            className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-800 hover:text-white"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 flex gap-3">
          <img src={item.coverUrl} alt={item.title} className="h-24 w-16 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="text-xs text-stone-500">Você marcou como visto</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-400">
              Nota
            </label>
            <StarRating value={rating} onChange={setRating} size={26} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-400">
              Comentário
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="O que você achou? (opcional)"
              rows={3}
              className="w-full resize-none rounded-lg border border-stone-800 bg-stone-950 px-3 py-2.5 text-sm text-white placeholder-stone-600 outline-none focus:border-[#a32638]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-400">
              Quem pode ver
            </label>
            <div className="flex overflow-hidden rounded-lg border border-stone-800">
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisibility(opt.value)}
                  className={`flex-1 px-2 py-2 text-xs font-medium transition ${
                    visibility === opt.value
                      ? "bg-[#a32638] text-white"
                      : "bg-stone-950 text-stone-400 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2.5 text-xs text-[#d97a86]">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onSkip}
              disabled={submitting}
              className="flex-1 rounded-lg border border-stone-800 bg-stone-950 py-3 text-sm font-medium text-stone-300 transition hover:border-stone-700 hover:text-white disabled:opacity-50"
            >
              Não compartilhar
            </button>
            <button
              type="button"
              onClick={() => onShare(rating, review, visibility)}
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#a32638] py-3 text-sm font-semibold text-white transition hover:bg-[#bd3347] active:scale-[0.99] disabled:opacity-60"
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              {submitting ? "Compartilhando…" : "Compartilhar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
