import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { TmdbMovie } from "../services/tmdb";
import { getBackdropUrl } from "../services/tmdb";

interface HeroSectionProps {
  items: (TmdbMovie & { media_type: "movie" | "tv" })[];
  onAdd: (item: TmdbMovie) => void;
  onOpenDetails?: (item: TmdbMovie & { media_type: "movie" | "tv" }) => void;
}

export function HeroSection({ items, onAdd, onOpenDetails }: HeroSectionProps) {
  const [index, setIndex] = useState(0);
  const slides = items.slice(0, 5);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const current = slides[index % slides.length];
  const title = current.title ?? current.name ?? "Sem título";
  const backdrop = getBackdropUrl(current.backdrop_path);

  return (
    <section className="relative -mx-4 h-[52vh] min-h-[320px] overflow-hidden sm:-mx-6 sm:rounded-2xl sm:h-[60vh]">
      {backdrop && (
        <img
          key={current.id}
          src={backdrop}
          alt={title}
          fetchPriority="high"
          onClick={() => onOpenDetails?.(current)}
          onKeyDown={(e) => {
            if (onOpenDetails && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onOpenDetails(current);
            }
          }}
          role={onOpenDetails ? "button" : undefined}
          tabIndex={onOpenDetails ? 0 : undefined}
          aria-label={onOpenDetails ? `Ver detalhes de ${title}` : undefined}
          className={`absolute inset-0 h-full w-full object-cover ${
            onOpenDetails ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a32638]" : ""
          }`}
        />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-[#0e0c0a] via-[#0e0c0a]/40 to-transparent" />
      <div className="absolute inset-0 bg-linear-to-r from-[#0e0c0a]/80 via-transparent to-transparent" />

      <div className="absolute inset-x-0 bottom-0 space-y-3 p-5 sm:p-8">
        <span className="rounded-full bg-[#a32638]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          Em alta
        </span>
        <h2
          onClick={() => onOpenDetails?.(current)}
          className={`font-display max-w-lg text-3xl font-semibold text-white drop-shadow sm:text-5xl ${
            onOpenDetails ? "cursor-pointer hover:underline" : ""
          }`}
        >
          {title}
        </h2>
        {current.overview && (
          <p className="line-clamp-2 max-w-md text-xs text-stone-300 sm:text-sm">
            {current.overview}
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => onAdd(current)}
            className="flex items-center gap-1.5 rounded-lg bg-[#a32638] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#bd3347] active:scale-95"
          >
            <Plus size={16} /> Minha Lista
          </button>

          <div className="flex gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                onClick={() => setIndex(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-[width,background-color] ${
                  i === index ? "w-6 bg-[#a32638]" : "w-1.5 bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
