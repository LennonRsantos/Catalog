import { Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
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
  // Scroll position this row is easing towards. Kept separate from the
  // element's actual scrollLeft so rapid wheel ticks accumulate into one
  // target instead of each restarting a fresh scroll — that restart-fighting
  // is what made relying on CSS scroll-behavior: smooth feel laggy/jerky.
  const targetLeft = useRef(0);
  const animating = useRef(false);

  // Lets the mouse wheel drive this row's horizontal scroll instead of the
  // page's vertical one, replacing the old hover arrow buttons. Needs a
  // native (non-React) listener with passive: false — React's synthetic
  // onWheel attaches passively, so calling preventDefault() there is
  // silently ignored and the page would scroll vertically underneath.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const SPEED = 2.2; // wheel delta multiplier — "levemente mais rápido"
    const EASE = 0.22; // per-frame catch-up fraction — higher = snappier

    function step() {
      const el2 = scrollRef.current;
      if (!el2) {
        animating.current = false;
        return;
      }
      const diff = targetLeft.current - el2.scrollLeft;
      if (Math.abs(diff) < 0.5) {
        el2.scrollLeft = targetLeft.current;
        animating.current = false;
        return;
      }
      el2.scrollLeft += diff * EASE;
      requestAnimationFrame(step);
    }

    function handleWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      if (!animating.current) targetLeft.current = el!.scrollLeft;
      const max = el!.scrollWidth - el!.clientWidth;
      targetLeft.current = Math.min(Math.max(targetLeft.current + e.deltaY * SPEED, 0), max);
      if (!animating.current) {
        animating.current = true;
        requestAnimationFrame(step);
      }
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

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
