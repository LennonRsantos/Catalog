import { Loader2 } from "lucide-react";
import type { TmdbMovie } from "../services/tmdb";
import { TmdbResultCard } from "./TmdbResultCard";

interface TmdbSearchResultsProps {
  items: (TmdbMovie & { media_type: "movie" | "tv" })[];
  loading: boolean;
  error: string | null;
  onAdd: (item: TmdbMovie) => void;
  onOpenDetails?: (item: TmdbMovie & { media_type: "movie" | "tv" }) => void;
}

export function TmdbSearchResults({ items, loading, error, onAdd, onOpenDetails }: TmdbSearchResultsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-stone-500">
        <Loader2 className="animate-spin" size={18} /> Buscando no TMDb…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-900/40 bg-red-950/20 py-10 text-center text-sm text-[#d97a86]">
        Erro ao buscar: {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center text-sm text-stone-500">Nenhum resultado encontrado.</div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <TmdbResultCard
          key={`${item.media_type}-${item.id}`}
          item={item}
          onAdd={onAdd}
          onOpenDetails={onOpenDetails}
        />
      ))}
    </div>
  );
}
