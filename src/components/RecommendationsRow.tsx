import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import { useRef } from "react";
import type { TmdbMovie } from "../services/tmdb";
import { TmdbResultCard } from "./TmdbResultCard";

interface RecommendationsRowProps {
  title?: string;
  icon?: LucideIcon;
  items: (TmdbMovie & { media_type: "movie" | "tv" })[];
  loading: boolean;
  onAdd: (item: TmdbMovie) => void;
  onOpenDetails?: (item: TmdbMovie & { media_type: "movie" | "tv" }) => void;
}

export function RecommendationsRow({
  title = "Em alta esta semana",
  icon: Icon = Sparkles,
  items,
  loading,
  onAdd,
  onOpenDetails,
}: RecommendationsRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!loading && items.length === 0) return null;

  const scrollByAmount = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.9 * (direction === "left" ? -1 : 1);
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <section className="group/row relative space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
        <Icon size={15} className="text-[#a32638]" />
        {title}
      </h2>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-stone-500">
          <Loader2 className="animate-spin" size={16} /> Carregando…
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            aria-label="Rolar para a esquerda"
            onClick={() => scrollByAmount("left")}
            className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-black/70 p-1.5 text-white opacity-0 transition hover:bg-black/90 group-hover/row:opacity-100 sm:block"
          >
            <ChevronLeft size={18} />
          </button>

          <div ref={scrollRef} className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth pb-1">
            {items.map((item) => (
              <div key={`${item.media_type}-${item.id}`} className="w-32 shrink-0 sm:w-36">
                <TmdbResultCard item={item} onAdd={onAdd} onOpenDetails={onOpenDetails} />
              </div>
            ))}
          </div>

          <button
            type="button"
            aria-label="Rolar para a direita"
            onClick={() => scrollByAmount("right")}
            className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-black/70 p-1.5 text-white opacity-0 transition hover:bg-black/90 group-hover/row:opacity-100 sm:block"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
