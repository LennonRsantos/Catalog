import { Search } from "lucide-react";
import type { MediaType } from "../types";

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  typeFilter: MediaType | "Todos";
  onTypeFilterChange: (type: MediaType | "Todos") => void;
  showTypeFilter?: boolean;
}

const FILTERS: (MediaType | "Todos")[] = ["Todos", "Filme", "Série"];

export function SearchBar({
  query,
  onQueryChange,
  typeFilter,
  onTypeFilterChange,
  showTypeFilter = true,
}: SearchBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar por título…"
          aria-label="Buscar por título"
          autoComplete="off"
          className="w-full rounded-lg border border-stone-800 bg-stone-900 py-2.5 pl-9 pr-3 text-sm text-white placeholder-stone-600 outline-none focus:border-[#a32638]"
        />
      </div>

      {showTypeFilter && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => onTypeFilterChange(filter)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                typeFilter === filter
                  ? "border-[#a32638] bg-[#a32638]/10 text-[#bd3347]"
                  : "border-stone-800 bg-stone-900 text-stone-400 hover:text-white"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
