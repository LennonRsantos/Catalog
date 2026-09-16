import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Clapperboard, Search, Star } from "lucide-react";
import type { Genre, MediaItem, MediaStatus, MediaType } from "../types";
import { MediaCard } from "./MediaCard";
import { StatusTabs } from "./StatusTabs";
import { ResumeSessionCard } from "./ResumeSessionCard";

type SortBy = "recent" | "rating" | "title";
type ProgFilter = "Todos" | MediaType | "Favoritos";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "recent", label: "Adicionado recentemente" },
  { value: "rating", label: "Nota" },
  { value: "title", label: "Título" },
];

const SECTION_TITLE: Record<MediaStatus, string> = {
  "Quero Ver": "Na Lista",
  Assistindo: "Em Andamento",
  Visto: "Histórico",
};

interface ProgramasTabProps {
  items: MediaItem[];
  genres: Genre[];
  onStatusChange: (id: string, status: MediaStatus) => void;
  onRatingChange: (id: string, rating: number) => void;
  onEdit: (item: MediaItem) => void;
  onDelete: (id: string) => void;
  onOpenDetails: (item: MediaItem) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onMoveFavoriteRank: (id: string, direction: "up" | "down") => void;
}

export function ProgramasTab({
  items,
  genres,
  onStatusChange,
  onRatingChange,
  onEdit,
  onDelete,
  onOpenDetails,
  onToggleFavorite,
  onMoveFavoriteRank,
}: ProgramasTabProps) {
  const [activeStatus, setActiveStatus] = useState<MediaStatus>("Assistindo");
  const [progFilter, setProgFilter] = useState<ProgFilter>("Todos");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("recent");

  // New items always land in "Quero Ver" first. Without this, a catalog
  // whose only items are "Quero Ver" opens on the empty "Assistindo" tab,
  // making a just-added item look like it was never added. Runs once, the
  // first time real data arrives, and never overrides a tab the user already
  // has items in or has since picked themselves.
  const hasAutoSelected = useRef(false);
  const userPickedTab = useRef(false);
  useEffect(() => {
    if (hasAutoSelected.current || userPickedTab.current || items.length === 0) return;
    hasAutoSelected.current = true;
    if (items.some((i) => i.status === "Assistindo")) return;
    if (items.some((i) => i.status === "Quero Ver")) {
      setActiveStatus("Quero Ver");
    } else if (items.some((i) => i.status === "Visto")) {
      setActiveStatus("Visto");
    }
  }, [items]);

  function selectStatus(status: MediaStatus) {
    userPickedTab.current = true;
    setActiveStatus(status);
  }

  const genreNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const genre of genres) map.set(genre.id, genre.name);
    return map;
  }, [genres]);

  const counts = useMemo(() => {
    return {
      "Quero Ver": items.filter((i) => i.status === "Quero Ver").length,
      Assistindo: items.filter((i) => i.status === "Assistindo").length,
      Visto: items.filter((i) => i.status === "Visto").length,
    } satisfies Record<MediaStatus, number>;
  }, [items]);

  const statusItems = useMemo(
    () => items.filter((item) => item.status === activeStatus),
    [items, activeStatus]
  );

  const filterCounts = useMemo(
    () => ({
      Série: statusItems.filter((i) => i.type === "Série").length,
      Filme: statusItems.filter((i) => i.type === "Filme").length,
      Favoritos: statusItems.filter((i) => i.isFavorite).length,
    }),
    [statusItems]
  );

  const heroItem = useMemo(() => {
    if (activeStatus !== "Assistindo") return null;
    const withProgress = statusItems.find(
      (i) => i.type === "Filme" && Boolean(i.runtimeMinutes) && Boolean(i.progressMinutes)
    );
    return withProgress ?? [...statusItems].sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
  }, [activeStatus, statusItems]);

  const showSeriesRow = activeStatus === "Assistindo" && progFilter === "Todos";

  const seriesInProgress = useMemo(
    () => (showSeriesRow ? statusItems.filter((i) => i.type === "Série" && i.id !== heroItem?.id) : []),
    [showSeriesRow, statusItems, heroItem]
  );

  const filteredItems = useMemo(() => {
    const filtered = statusItems
      .filter((item) => {
        if (progFilter === "Todos") return true;
        if (progFilter === "Favoritos") return item.isFavorite;
        return item.type === progFilter;
      })
      .filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase()));

    const sorted = [...filtered];
    if (progFilter === "Favoritos") {
      sorted.sort((a, b) => {
        const rankA = a.favoriteRank ?? Infinity;
        const rankB = b.favoriteRank ?? Infinity;
        if (rankA !== rankB) return rankA - rankB;
        return b.createdAt - a.createdAt;
      });
    } else if (sortBy === "rating") sorted.sort((a, b) => b.rating - a.rating);
    else if (sortBy === "title") sorted.sort((a, b) => a.title.localeCompare(b.title));
    else sorted.sort((a, b) => b.createdAt - a.createdAt);
    return sorted;
  }, [statusItems, progFilter, query, sortBy]);

  const isFavoritesView = progFilter === "Favoritos";

  // Ranks are scoped per media type (see useCatalog.ts's moveFavoriteRank),
  // so up/down reorder buttons must operate within one type's own sub-list.
  const favMovies = useMemo(
    () => (isFavoritesView ? filteredItems.filter((i) => i.type === "Filme") : []),
    [isFavoritesView, filteredItems]
  );
  const favSeries = useMemo(
    () => (isFavoritesView ? filteredItems.filter((i) => i.type === "Série") : []),
    [isFavoritesView, filteredItems]
  );

  const gridItems =
    activeStatus === "Assistindo"
      ? filteredItems.filter((i) => i.id !== heroItem?.id && !(showSeriesRow && i.type === "Série"))
      : filteredItems;

  const filterChips: { key: ProgFilter; label: string }[] = [
    { key: "Todos", label: "Todos" },
    { key: "Série", label: `Séries (${filterCounts.Série})` },
    { key: "Filme", label: `Filmes (${filterCounts.Filme})` },
    { key: "Favoritos", label: "Favoritos" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Catalog
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-stone-500">
          O que você está assistindo, quer ver e já viu.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, gênero, criador…"
            aria-label="Buscar por título, gênero, criador"
            autoComplete="off"
            className="w-full rounded-lg border border-stone-800 bg-stone-900 py-2.5 pl-9 pr-3 text-sm text-white placeholder-stone-600 outline-none focus:border-[#a32638]"
          />
        </div>

        {!isFavoritesView && (
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="shrink-0 rounded-lg border border-stone-800 bg-stone-900 px-3 py-2.5 text-xs font-medium text-stone-300 outline-none focus:border-[#a32638]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Ordenar: {option.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <StatusTabs active={activeStatus} onChange={selectStatus} counts={counts} />

        <div className="relative">
          <div className="no-scrollbar flex gap-2.5 overflow-x-auto">
            {filterChips.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setProgFilter(key)}
                className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition ${
                  progFilter === key
                    ? "border-[#a32638] bg-[#a32638]/10 text-[#bd3347]"
                    : "border-stone-800 bg-stone-900 text-stone-400 hover:text-white"
                }`}
              >
                {key === "Favoritos" && <Star size={12} className={progFilter === key ? "fill-[#d9a441] text-[#d9a441]" : ""} />}
                {label}
              </button>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-[#0e0c0a] to-transparent lg:hidden" />
        </div>
      </div>

      {heroItem && (
        <ResumeSessionCard
          item={heroItem}
          genreName={heroItem.genreIds?.[0] ? genreNameById.get(heroItem.genreIds[0]) ?? null : null}
          onContinue={onEdit}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
        />
      )}

      {seriesInProgress.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              Séries em Andamento
              <span className="rounded-full bg-stone-800 px-1.5 py-0.5 text-[10px] text-stone-400">
                {seriesInProgress.length} ativas
              </span>
            </h2>
            <button
              onClick={() => selectStatus("Visto")}
              className="text-xs font-medium text-[#bd3347] hover:text-[#d97a86]"
            >
              Ver histórico completo →
            </button>
          </div>

          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
            {seriesInProgress.map((item) => (
              <div key={item.id} className="w-32 shrink-0 sm:w-36">
                <MediaCard
                  item={item}
                  onStatusChange={onStatusChange}
                  onRatingChange={onRatingChange}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onOpenDetails={onOpenDetails}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {isFavoritesView ? (
        <>
          <FavoritesGrid
            title="Top 10 Filmes"
            items={favMovies}
            onStatusChange={onStatusChange}
            onRatingChange={onRatingChange}
            onEdit={onEdit}
            onDelete={onDelete}
            onOpenDetails={onOpenDetails}
            onToggleFavorite={onToggleFavorite}
            onMoveFavoriteRank={onMoveFavoriteRank}
          />
          <FavoritesGrid
            title="Top 10 Séries"
            items={favSeries}
            onStatusChange={onStatusChange}
            onRatingChange={onRatingChange}
            onEdit={onEdit}
            onDelete={onDelete}
            onOpenDetails={onOpenDetails}
            onToggleFavorite={onToggleFavorite}
            onMoveFavoriteRank={onMoveFavoriteRank}
          />
          {favMovies.length === 0 && favSeries.length === 0 && !heroItem && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stone-800 py-20 text-center">
              <Star size={32} className="text-stone-700" />
              <p className="text-sm text-stone-500">Nenhum favorito ainda.</p>
              <p className="text-xs text-stone-600">
                Marque um título como favorito ao adicioná-lo ou editá-lo.
              </p>
            </div>
          )}
        </>
      ) : (
        <section className="space-y-3">
          {activeStatus !== "Assistindo" && (
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                {SECTION_TITLE[activeStatus]}
                <span className="rounded-full bg-stone-800 px-1.5 py-0.5 text-[10px] text-stone-400">
                  {gridItems.length}
                </span>
              </h2>
            </div>
          )}

          {gridItems.length === 0 ? (
            heroItem ? null : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stone-800 py-20 text-center">
                <Clapperboard size={32} className="text-stone-700" />
                <p className="text-sm text-stone-500">Nada por aqui ainda.</p>
                <p className="text-xs text-stone-600">Descubra títulos na aba Explorar e adicione à sua lista.</p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {gridItems.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onStatusChange={onStatusChange}
                  onRatingChange={onRatingChange}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onOpenDetails={onOpenDetails}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

interface FavoritesGridProps {
  title: string;
  items: MediaItem[];
  onStatusChange: (id: string, status: MediaStatus) => void;
  onRatingChange: (id: string, rating: number) => void;
  onEdit: (item: MediaItem) => void;
  onDelete: (id: string) => void;
  onOpenDetails: (item: MediaItem) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onMoveFavoriteRank: (id: string, direction: "up" | "down") => void;
}

function FavoritesGrid({
  title,
  items,
  onStatusChange,
  onRatingChange,
  onEdit,
  onDelete,
  onOpenDetails,
  onToggleFavorite,
  onMoveFavoriteRank,
}: FavoritesGridProps) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          {title}
          <span className="rounded-full bg-stone-800 px-1.5 py-0.5 text-[10px] text-stone-400">
            {items.length}
          </span>
        </h2>
        <span className="text-xs text-stone-500">Use as setas para reordenar</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item, index) => (
          <div key={item.id} className="space-y-1.5">
            <MediaCard
              item={item}
              onStatusChange={onStatusChange}
              onRatingChange={onRatingChange}
              onEdit={onEdit}
              onDelete={onDelete}
              onOpenDetails={onOpenDetails}
              onToggleFavorite={onToggleFavorite}
            />
            {item.favoriteRank != null && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => onMoveFavoriteRank(item.id, "up")}
                  disabled={index === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-md bg-stone-900 text-stone-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Subir no ranking"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => onMoveFavoriteRank(item.id, "down")}
                  disabled={index === items.length - 1}
                  className="flex h-9 w-9 items-center justify-center rounded-md bg-stone-900 text-stone-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Descer no ranking"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
