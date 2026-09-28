import { Check, ChevronDown, RotateCcw, Star } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Genre, MediaType } from "../types";
import type { DiscoverOptions, DiscoverSort } from "../services/tmdb";

interface ExploreFiltersProps {
  genres: Genre[];
  selectedGenreIds: number[];
  onToggleGenre: (id: number) => void;
  onClearGenres: () => void;
  typeFilter: MediaType | "Todos";
  onTypeFilterChange: (type: MediaType | "Todos") => void;
  options: DiscoverOptions;
  onOptionsChange: (patch: Partial<DiscoverOptions>) => void;
  activeCount: number;
  onReset: () => void;
}

const TYPES: { value: MediaType | "Todos"; label: string }[] = [
  { value: "Todos", label: "Todos" },
  { value: "Filme", label: "Filmes" },
  { value: "Série", label: "Séries" },
];

const SORTS: { value: DiscoverSort; label: string; hint: string }[] = [
  { value: "popularity", label: "Mais populares", hint: "O que está sendo visto agora" },
  { value: "rating", label: "Mais bem avaliados", hint: "Nota alta com muitos votos" },
  { value: "newest", label: "Lançamentos recentes", hint: "Do mais novo ao mais antigo" },
];

const CURRENT_YEAR = new Date().getFullYear();
const GENRES_COLLAPSED = 12;

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-stone-800/80 px-5 py-5 first:border-t-0">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-[13px] font-semibold text-stone-200">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function parseYear(value: string): number | null {
  const n = Number(value);
  return value.length === 4 && n >= 1900 && n <= CURRENT_YEAR + 2 ? n : null;
}

// Holds the raw text while typing; only a complete, plausible year (or an
// empty field) is reported up. Presets and "Limpar" push new values down.
function YearInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: number | null;
  onChange: (year: number | null) => void;
}) {
  const [text, setText] = useState(value ? String(value) : "");
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setText(value ? String(value) : "");
  }

  return (
    <label className="flex-1">
      <span className="sr-only">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        maxLength={4}
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, "");
          setText(next);
          const year = parseYear(next);
          if (year !== null || next === "") {
            setSynced(year);
            onChange(year);
          }
        }}
        className="h-10 w-full rounded-lg border border-stone-800 bg-black/30 px-3 text-sm text-white placeholder-stone-600 outline-none focus:border-[#bd3347]"
      />
    </label>
  );
}

export function ExploreFilters({
  genres,
  selectedGenreIds,
  onToggleGenre,
  onClearGenres,
  typeFilter,
  onTypeFilterChange,
  options,
  onOptionsChange,
  activeCount,
  onReset,
}: ExploreFiltersProps) {
  const [showAllGenres, setShowAllGenres] = useState(false);
  // Selected genres stay visible even when the list is collapsed.
  const visibleGenres = showAllGenres
    ? genres
    : genres.filter((g, i) => i < GENRES_COLLAPSED || selectedGenreIds.includes(g.id));
  return (
    <aside
      aria-label="Filtros"
      className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-stone-800 bg-stone-900/50 scrollbar-thin"
    >
      <div className="flex items-center justify-between px-5 pb-1 pt-5">
        <h2 className="font-display text-lg font-semibold tracking-tight text-white">Filtros</h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-stone-400 transition hover:text-white"
          >
            <RotateCcw size={12} /> Limpar ({activeCount})
          </button>
        )}
      </div>

      <Section title="Tipo">
        <div role="radiogroup" aria-label="Tipo" className="grid grid-cols-3 rounded-lg bg-black/30 p-1 ring-1 ring-stone-800">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={typeFilter === t.value}
              onClick={() => onTypeFilterChange(t.value)}
              className={`h-8 rounded-md text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd3347] ${
                typeFilter === t.value ? "bg-[#a32638] text-white shadow" : "text-stone-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Ordenar por">
        <div role="radiogroup" aria-label="Ordenar por" className="-mx-2 space-y-0.5">
          {SORTS.map((s) => {
            const active = options.sort === s.value;
            return (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onOptionsChange({ sort: s.value })}
                className={`flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd3347] ${
                  active ? "bg-[#a32638]/10" : "hover:bg-white/3"
                }`}
              >
                <span
                  className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                    active ? "border-[#bd3347]" : "border-stone-600"
                  }`}
                >
                  {active && <span className="h-2 w-2 rounded-full bg-[#bd3347]" />}
                </span>
                <span>
                  <span className={`block text-sm ${active ? "font-semibold text-white" : "text-stone-300"}`}>
                    {s.label}
                  </span>
                  <span className="block text-xs text-stone-500">{s.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        title="Gêneros"
        aside={
          selectedGenreIds.length > 0 && (
            <button type="button" onClick={onClearGenres} className="text-xs text-[#d97a86] hover:text-[#f0b8bf]">
              Limpar
            </button>
          )
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {visibleGenres.map((genre) => {
            const selected = selectedGenreIds.includes(genre.id);
            return (
              <button
                key={genre.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onToggleGenre(genre.id)}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd3347] ${
                  selected
                    ? "border-[#a32638] bg-[#a32638] text-white"
                    : "border-stone-700/80 text-stone-400 hover:border-stone-500 hover:text-white"
                }`}
              >
                {selected && <Check size={11} strokeWidth={3} />}
                {genre.name}
              </button>
            );
          })}
        </div>
        {genres.length > GENRES_COLLAPSED && (
          <button
            type="button"
            aria-expanded={showAllGenres}
            onClick={() => setShowAllGenres((v) => !v)}
            className="mt-2.5 flex items-center gap-1 text-xs font-medium text-stone-400 transition hover:text-white"
          >
            {showAllGenres ? "Mostrar menos" : `Ver todos os gêneros (${genres.length})`}
            <ChevronDown size={13} className={`transition ${showAllGenres ? "rotate-180" : ""}`} />
          </button>
        )}
        {selectedGenreIds.length > 1 && (
          <p className="mt-2.5 text-xs text-stone-500">Mostrando títulos de qualquer um dos gêneros.</p>
        )}
      </Section>

      <Section title="Ano de lançamento">
        <div className="flex items-center gap-2">
          <YearInput
            label="A partir de"
            placeholder="De"
            value={options.yearFrom}
            onChange={(yearFrom) => onOptionsChange({ yearFrom })}
          />
          <span className="text-stone-600">–</span>
          <YearInput
            label="Até"
            placeholder="Até"
            value={options.yearTo}
            onChange={(yearTo) => onOptionsChange({ yearTo })}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            { label: "Este ano", from: CURRENT_YEAR, to: CURRENT_YEAR },
            { label: "Anos 2010", from: 2010, to: 2019 },
            { label: "Anos 2000", from: 2000, to: 2009 },
            { label: "Clássicos", from: null, to: 1989 },
          ].map((p) => {
            const active = options.yearFrom === p.from && options.yearTo === p.to;
            return (
              <button
                key={p.label}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onOptionsChange(active ? { yearFrom: null, yearTo: null } : { yearFrom: p.from, yearTo: p.to })
                }
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                  active ? "bg-[#a32638]/15 text-[#f0b8bf]" : "bg-white/4 text-stone-400 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        title="Nota mínima"
        aside={
          <span className="flex items-center gap-1 text-xs font-semibold text-stone-300">
            {options.minRating > 0 ? (
              <>
                <Star size={11} className="fill-[#d9a441] text-[#d9a441]" />
                {options.minRating.toFixed(1)}+
              </>
            ) : (
              <span className="font-normal text-stone-500">Qualquer</span>
            )}
          </span>
        }
      >
        <input
          type="range"
          min={0}
          max={9}
          step={0.5}
          value={options.minRating}
          onChange={(e) => onOptionsChange({ minRating: Number(e.target.value) })}
          aria-label="Nota mínima"
          className="w-full accent-[#bd3347]"
        />
        <div className="mt-1 flex justify-between text-[10px] text-stone-600">
          <span>0</span>
          <span>3</span>
          <span>6</span>
          <span>9</span>
        </div>
      </Section>

      <Section title="Meu catálogo">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm text-stone-300">Esconder o que já adicionei</span>
          <input
            type="checkbox"
            checked={options.hideOwned}
            onChange={(e) => onOptionsChange({ hideOwned: e.target.checked })}
            className="peer sr-only"
          />
          <span className="relative h-5 w-9 shrink-0 rounded-full bg-stone-700 transition peer-checked:bg-[#a32638] peer-focus-visible:ring-2 peer-focus-visible:ring-[#bd3347] after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4" />
        </label>
      </Section>
    </aside>
  );
}
