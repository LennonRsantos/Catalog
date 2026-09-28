import { Clapperboard, Flame, Loader2, Sparkles, Tv } from "lucide-react";
import { useCallback, useRef } from "react";
import { useWheelScroll } from "../hooks/useWheelScroll";
import type { Genre, MediaType } from "../types";
import type { TmdbMovie } from "../services/tmdb";
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
  discoverResults: TmdbMediaItem[];
  discoverLoading: boolean;
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
  discoverResults,
  discoverLoading,
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
  const isFiltering = selectedGenreIds.length > 0;

  function matchesTypeFilter(item: TmdbMediaItem) {
    if (typeFilter === "Todos") return true;
    return typeFilter === "Filme" ? item.media_type === "movie" : item.media_type === "tv";
  }

  const filteredDiscoverResults = discoverResults.filter(matchesTypeFilter);
  const filteredTrending = trending.filter(matchesTypeFilter);
  const filteredPopular = popular.filter(matchesTypeFilter);
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

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">Explorar</h1>

      {!isSearching && <HeroSection items={trending} onAdd={onAdd} onOpenDetails={onOpenDetails} />}

      <SearchBar
        query={query}
        onQueryChange={onQueryChange}
        typeFilter={typeFilter}
        onTypeFilterChange={onTypeFilterChange}
      />

      <div
        ref={setGenreRow}
        onMouseDown={handleGenreMouseDown}
        onMouseMove={handleGenreMouseMove}
        onMouseUp={stopGenreDrag}
        onMouseLeave={stopGenreDrag}
        className="no-scrollbar flex cursor-grab gap-2.5 overflow-x-auto select-none active:cursor-grabbing"
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

      {isSearching ? (
        <TmdbSearchResults
          items={tmdbResults}
          loading={searchLoading}
          error={searchError}
          onAdd={onAdd}
          onOpenDetails={onOpenDetails}
        />
      ) : isFiltering ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">Resultados por Gênero</h2>
          {discoverLoading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
              <Loader2 className="animate-spin" size={16} /> Carregando…
            </div>
          ) : filteredDiscoverResults.length === 0 ? (
            <p className="py-10 text-center text-sm text-stone-500">Nenhum resultado encontrado.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredDiscoverResults.map((item) => (
                <TmdbResultCard
                  key={`${item.media_type}-${item.id}`}
                  item={item}
                  onAdd={onAdd}
                  onOpenDetails={onOpenDetails}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {showMovieRow && (
            <RecommendationsRow
              title="Filmes para Você"
              icon={Clapperboard}
              items={personalizedMovies}
              loading={personalizedMoviesLoading}
              onAdd={onAdd}
              onOpenDetails={onOpenDetails}
            />
          )}

          {showSeriesRow && (
            <RecommendationsRow
              title="Séries para Você"
              icon={Tv}
              items={personalizedSeries}
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
  );
}
