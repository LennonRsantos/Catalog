import { Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import { useWheelScroll } from "../hooks/useWheelScroll";
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
  const scrollRef = useWheelScroll();

  if (!loading && items.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
        <Icon size={15} className="text-[#a32638]" />
        {title}
      </h2>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-stone-500">
          <Loader2 className="animate-spin" size={16} /> Carregando…
        </div>
      ) : (
        <div ref={scrollRef} className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
          {items.map((item) => (
            <div key={`${item.media_type}-${item.id}`} className="w-32 shrink-0 sm:w-36">
              <TmdbResultCard item={item} onAdd={onAdd} onOpenDetails={onOpenDetails} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
