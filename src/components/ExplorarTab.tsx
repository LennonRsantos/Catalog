import { Clapperboard, Flame, Loader2, SearchX, Sparkles, Star, Tv, X } from "lucide-react";
import { useCallback, useMemo, useRef } from "react";
import { useWheelScroll } from "../hooks/useWheelScroll";
import { useDiscover } from "../hooks/useDiscover";
import type { Genre, MediaItem, MediaType } from "../types";
import type { DiscoverOptions, TmdbMovie } from "../services/tmdb";
import { ExploreFilters } from "./ExploreFilters";
import { SearchBar } from "./SearchBar";
import { HeroSection } from "./HeroSection";
import { RecommendationsRow } from "./RecommendationsRow";
import { TmdbSearchResults } from "./TmdbSearchResults";
import { TmdbResultCard } from "./TmdbResultCard";

type TmdbMediaItem = TmdbMovie & { media_type: "movie" | "tv" };

interface ExplorarTabProps {
  query: string;
  onQueryChange: (query: string) => void;
  typeFilter: MediaType | "Todos";
  onTypeFilterChange: (type: MediaType | "Todos") => void;
  isSearching: boolean;
  tmdbResults: TmdbMediaItem[];
  searchLoading: boolean;
  searchError: string | null;
  genres: Genre[];
  selectedGenreIds: number[];
  onToggleGenre: (id: number) => void;
  onClearGenres: () => void;
  discoverOptions: DiscoverOptions;
  onDiscoverOptionsChange: (patch: Partial<DiscoverOptions>) => void;
  onResetDiscover: () => void;
  catalogItems: MediaItem[];
  trending: TmdbMediaItem[];
  trendingLoading: boolean;
  popular: TmdbMediaItem[];
  popularLoading: boolean;
  personalizedMovies: TmdbMediaItem[];
  personalizedMoviesLoading: boolean;
  personalizedSeries: TmdbMediaItem[];
  personalizedSeriesLoading: boolean;
  hasMovieFavorites: boolean;
  hasSeriesFavorites: boolean;
  onAdd: (item: TmdbMovie) => void;
  onOpenDetails: (item: TmdbMediaItem) => void;
}

export function ExplorarTab({
  query,
  onQueryChange,
  typeFilter,
  onTypeFilterChange,
  isSearching,
  tmdbResults,
  searchLoading,
  searchError,
  genres,
  selectedGenreIds,
  onToggleGenre,
  onClearGenres,
  discoverOptions,
  onDiscoverOptionsChange,
  onResetDiscover,
  catalogItems,
  trending,
  trendingLoading,
  popular,
  popularLoading,
  personalizedMovies,
  personalizedMoviesLoading,
  personalizedSeries,
  personalizedSeriesLoading,
  hasMovieFavorites,
  hasSeriesFavorites,
  onAdd,
  onOpenDetails,
}: ExplorarTabProps) {
  const { sort, yearFrom, yearTo, minRating, hideOwned } = discoverOptions;
  // Anything that narrows or reorders the catalog switches the rows to a grid.
  const isFiltering =
    selectedGenreIds.length > 0 || sort !== "popularity" || yearFrom !== null || yearTo !== null || minRating > 0;
  const activeCount =
    selectedGenreIds.length +
    (sort !== "popularity" ? 1 : 0) +
    (yearFrom !== null || yearTo !== null ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (hideOwned ? 1 : 0) +
    (typeFilter !== "Todos" ? 1 : 0);

  const discover = useDiscover(isFiltering && !isSearching, typeFilter, selectedGenreIds, discoverOptions);

  const ownedKeys = useMemo(
    () =>
      new Set(
        catalogItems.filter((i) => i.tmdbId).map((i) => `${i.type === "Série" ? "tv" : "movie"}-${i.tmdbId}`)
      ),
    [catalogItems]
  );

  function isVisible(item: TmdbMediaItem) {
    if (typeFilter === "Filme" && item.media_type !== "movie") return false;
    if (typeFilter === "Série" && item.media_type !== "tv") return false;
    return !hideOwned || !ownedKeys.has(`${item.media_type}-${item.id}`);
  }

  const filteredDiscoverResults = discover.items.filter(isVisible);
  const filteredTrending = trending.filter(isVisible);
  const filteredPopular = popular.filter(isVisible);
  const visibleMovies = personalizedMovies.filter(isVisible);
  const visibleSeries = personalizedSeries.filter(isVisible);

  const genreNames = new Map(genres.map((g) => [g.id, g.name]));
  const yearLabel =
    yearFrom && yearTo
      ? yearFrom === yearTo
        ? String(yearFrom)
        : `${yearFrom}–${yearTo}`
      : yearFrom
        ? `Desde ${yearFrom}`
        : `Até ${yearTo}`;
  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (typeFilter !== "Todos")
    activeChips.push({
      key: "type",
      label: typeFilter === "Filme" ? "Filmes" : "Séries",
      onRemove: () => onTypeFilterChange("Todos"),
    });
  for (const id of selectedGenreIds)
    activeChips.push({ key: `g-${id}`, label: genreNames.get(id) ?? "Gênero", onRemove: () => onToggleGenre(id) });
  if (sort !== "popularity")
    activeChips.push({
      key: "sort",
      label: sort === "rating" ? "Mais bem avaliados" : "Lançamentos recentes",
      onRemove: () => onDiscoverOptionsChange({ sort: "popularity" }),
    });
  if (yearFrom !== null || yearTo !== null)
    activeChips.push({
      key: "year",
      label: yearLabel,
      onRemove: () => onDiscoverOptionsChange({ yearFrom: null, yearTo: null }),
    });
  if (minRating > 0)
    activeChips.push({
      key: "rating",
      label: `Nota ${minRating.toFixed(1)}+`,
      onRemove: () => onDiscoverOptionsChange({ minRating: 0 }),
    });
  if (hideOwned)
    activeChips.push({
      key: "owned",
      label: "Sem os que já adicionei",
      onRemove: () => onDiscoverOptionsChange({ hideOwned: false }),
    });
  const showMovieRow = typeFilter !== "Série" && hasMovieFavorites;
  const showSeriesRow = typeFilter !== "Filme" && hasSeriesFavorites;

  const genreScrollRef = useRef<HTMLDivElement | null>(null);
  const genreWheelRef = useWheelScroll();
  // Drag reads genreScrollRef; the wheel hook needs its own callback ref.
  const setGenreRow = useCallback(
    (el: HTMLDivElement | null) => {
      genreScrollRef.current = el;
      return genreWheelRef(el);
    },
    [genreWheelRef]
  );
  const drag = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

  function handleGenreMouseDown(e: React.MouseEvent) {
    const el = genreScrollRef.current;
    if (!el) return;
    drag.current = { isDown: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
  }

  function handleGenreMouseMove(e: React.MouseEvent) {
    if (!drag.current.isDown) return;
    const el = genreScrollRef.current;
    if (!el) return;
    e.preventDefault();
    const walk = e.pageX - el.offsetLeft - drag.current.startX;
    el.scrollLeft = drag.current.scrollLeft - walk;
  }

  function stopGenreDrag() {
    drag.current.isDown = false;
  }

  const genreRow = (
    <div
      ref={setGenreRow}
      onMouseDown={handleGenreMouseDown}
      onMouseMove={handleGenreMouseMove}
      onMouseUp={stopGenreDrag}
      onMouseLeave={stopGenreDrag}
      className="no-scrollbar flex cursor-grab gap-2.5 overflow-x-auto select-none active:cursor-grabbing lg:hidden"
    >
      {genres.map((genre) => {
        const selected = selectedGenreIds.includes(genre.id);
        return (
          <button
            key={genre.id}
            onClick={() => onToggleGenre(genre.id)}
            className={`min-h-10 shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition ${
              selected
                ? "border-[#a32638] bg-[#a32638] text-white"
                : "border-stone-800 bg-stone-900 text-stone-400 hover:border-stone-700 hover:text-white"
            }`}
          >
            {genre.name}
          </button>
        );
      })}
    </div>
  );

  const resultsGrid = (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <h2 className="text-sm font-semibold text-white">
          {discover.loading ? (
            "Buscando títulos…"
          ) : (
            <>
              {discover.totalResults.toLocaleString("pt-BR")}{" "}
              <span className="font-normal text-stone-400">
                {discover.totalResults === 1 ? "título encontrado" : "títulos encontrados"}
              </span>
            </>
          )}
        </h2>
        {activeChips.length > 0 && (
          <ul className="hidden flex-wrap gap-1.5 lg:flex">
            {activeChips.map((chip) => (
              <li key={chip.key}>
                <button
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={`Remover filtro ${chip.label}`}
                  className="flex items-center gap-1 rounded-full bg-[#a32638]/15 py-1 pl-2.5 pr-1.5 text-xs font-medium text-[#f0b8bf] transition hover:bg-[#a32638]/25"
                >
                  {chip.key === "rating" && <Star size={10} className="fill-[#d9a441] text-[#d9a441]" />}
                  {chip.label}
                  <X size={12} className="opacity-70" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {discover.loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-stone-800 bg-stone-900/60">
              <div className="aspect-2/3 animate-pulse bg-stone-800/60" />
              <div className="space-y-2 p-3">
                <div className="h-3 w-3/4 animate-pulse rounded bg-stone-800" />
                <div className="h-2.5 w-1/3 animate-pulse rounded bg-stone-800/70" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredDiscoverResults.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-stone-800 py-16 text-center">
          <SearchX size={28} className="text-stone-600" />
          <p className="text-sm text-stone-300">
            {discover.error ? "Não foi possível carregar os títulos." : "Nenhum título combina com esses filtros."}
          </p>
          <p className="max-w-xs text-xs text-stone-500">
            {discover.error
              ? "Verifique sua conexão e tente de novo."
              : "Remova um gênero ou amplie o período de lançamento."}
          </p>
          <button
            type="button"
            onClick={onResetDiscover}
            className="mt-1 rounded-lg border border-stone-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/5"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {filteredDiscoverResults.map((item) => (
              <TmdbResultCard
                key={`${item.media_type}-${item.id}`}
                item={item}
                onAdd={onAdd}
                onOpenDetails={onOpenDetails}
              />
            ))}
          </div>
          {discover.hasMore && (
            <button
              type="button"
              onClick={discover.loadMore}
              disabled={discover.loadingMore}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-stone-800 bg-stone-900/60 text-sm font-semibold text-white transition hover:border-[#a32638] hover:bg-[#a32638]/10 disabled:opacity-60"
            >
              {discover.loadingMore && <Loader2 size={16} className="animate-spin" />}
              {discover.loadingMore ? "Carregando…" : "Carregar mais"}
            </button>
          )}
        </>
      )}
    </section>
  );

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">Explorar</h1>

      {/* Filtered results take over the page on desktop; mobile keeps the hero on top. */}
      {!isSearching && (
        <div className={isFiltering ? "lg:hidden" : undefined}>
          <HeroSection items={trending} onAdd={onAdd} onOpenDetails={onOpenDetails} />
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[264px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="hidden lg:block">
          <ExploreFilters
            genres={genres}
            selectedGenreIds={selectedGenreIds}
            onToggleGenre={onToggleGenre}
            onClearGenres={onClearGenres}
            typeFilter={typeFilter}
            onTypeFilterChange={onTypeFilterChange}
            options={discoverOptions}
            onOptionsChange={onDiscoverOptionsChange}
            activeCount={activeCount}
            onReset={onResetDiscover}
          />
        </div>

        <div className="min-w-0 space-y-6">
          <SearchBar
            query={query}
            onQueryChange={onQueryChange}
            typeFilter={typeFilter}
            onTypeFilterChange={onTypeFilterChange}
          />

          {genreRow}

          {isSearching ? (
            <TmdbSearchResults
              items={tmdbResults}
              loading={searchLoading}
              error={searchError}
              onAdd={onAdd}
              onOpenDetails={onOpenDetails}
            />
          ) : isFiltering ? (
            resultsGrid
          ) : (
            <>
              {showMovieRow && (
                <RecommendationsRow
                  title="Filmes para Você"
                  icon={Clapperboard}
                  items={visibleMovies}
                  loading={personalizedMoviesLoading}
                  onAdd={onAdd}
                  onOpenDetails={onOpenDetails}
                />
              )}

              {showSeriesRow && (
                <RecommendationsRow
                  title="Séries para Você"
                  icon={Tv}
                  items={visibleSeries}
                  loading={personalizedSeriesLoading}
                  onAdd={onAdd}
                  onOpenDetails={onOpenDetails}
                />
              )}

              <RecommendationsRow
                title="Em Alta esta Semana"
                icon={Flame}
                items={filteredTrending}
                loading={trendingLoading}
                onAdd={onAdd}
                onOpenDetails={onOpenDetails}
              />

              <RecommendationsRow
                title="Populares"
                icon={Sparkles}
                items={filteredPopular}
                loading={popularLoading}
                onAdd={onAdd}
                onOpenDetails={onOpenDetails}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
