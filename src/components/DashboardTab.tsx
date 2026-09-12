import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { BarChart3, Bookmark, Clock, Eye, Film, Sparkles, Star, Tv } from "lucide-react";
import type { Genre, MediaItem } from "../types";

interface DashboardTabProps {
  items: MediaItem[];
  genres: Genre[];
}

const FALLBACK_MOVIE_MINUTES = 110;
const FALLBACK_SERIES_MINUTES = 300;

function formatMinutes(total: number): string {
  if (total <= 0) return "0min";
  const hours = Math.floor(total / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${total % 60}min`;
  return `${total}min`;
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 text-center">
      <Icon size={18} className="mx-auto mb-2 text-[#a32638]" />
      <p className="text-2xl font-extrabold text-white">{value}</p>
      <p className="text-xs text-stone-500">{label}</p>
    </div>
  );
}

export function DashboardTab({ items, genres }: DashboardTabProps) {
  const stats = useMemo(() => {
    const visto = items.filter((i) => i.status === "Visto");
    const assistindo = items.filter((i) => i.status === "Assistindo");
    const queroVer = items.filter((i) => i.status === "Quero Ver");

    const totalMinutes = visto.reduce((sum, item) => {
      if (item.runtimeMinutes) return sum + item.runtimeMinutes;
      return sum + (item.type === "Filme" ? FALLBACK_MOVIE_MINUTES : FALLBACK_SERIES_MINUTES);
    }, 0);

    const genreCounts = new Map<number, number>();
    for (const item of visto) {
      for (const gid of item.genreIds ?? []) {
        genreCounts.set(gid, (genreCounts.get(gid) ?? 0) + 1);
      }
    }
    let topGenreName: string | null = null;
    let topCount = 0;
    for (const [gid, count] of genreCounts) {
      if (count > topCount) {
        topCount = count;
        topGenreName = genres.find((g) => g.id === gid)?.name ?? null;
      }
    }

    const filmeCount = items.filter((i) => i.type === "Filme").length;
    const serieCount = items.filter((i) => i.type === "Série").length;
    const totalTyped = filmeCount + serieCount || 1;

    const ratedItems = visto.filter((i) => i.rating > 0);
    const avgRating =
      ratedItems.length > 0 ? ratedItems.reduce((sum, i) => sum + i.rating, 0) / ratedItems.length : 0;

    return {
      visto: visto.length,
      assistindo: assistindo.length,
      queroVer: queroVer.length,
      totalMinutes,
      topGenreName,
      filmeCount,
      serieCount,
      totalTyped,
      avgRating,
      ratedCount: ratedItems.length,
    };
  }, [items, genres]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">Dashboard</h1>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Visto" value={stats.visto} icon={Eye} />
        <StatCard label="Assistindo" value={stats.assistindo} icon={Clock} />
        <StatCard label="Quero Ver" value={stats.queroVer} icon={Bookmark} />
      </div>

      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-stone-400">
          <Clock size={14} /> Tempo Total Assistido (estimado)
        </div>
        <p className="mt-2 text-3xl font-extrabold text-white">{formatMinutes(stats.totalMinutes)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-stone-400">
            <Sparkles size={14} /> Gênero Mais Consumido
          </div>
          <p className="mt-2 text-xl font-bold text-white">{stats.topGenreName ?? "—"}</p>
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-stone-400">
            <Star size={14} /> Nota Média
          </div>
          <p className="mt-2 text-xl font-bold text-white">
            {stats.ratedCount > 0 ? stats.avgRating.toFixed(1) : "—"}{" "}
            <span className="text-sm font-normal text-stone-500">/ 10</span>
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-stone-400">
          <BarChart3 size={14} /> Filmes vs Séries
        </div>
        <div className="flex items-center gap-4 text-xs text-stone-300">
          <span className="flex items-center gap-1.5">
            <Film size={12} className="text-[#a32638]" /> Filmes ({stats.filmeCount})
          </span>
          <span className="flex items-center gap-1.5">
            <Tv size={12} className="text-stone-400" /> Séries ({stats.serieCount})
          </span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-stone-800">
          <div
            className="bg-[#a32638]"
            style={{ width: `${(stats.filmeCount / stats.totalTyped) * 100}%` }}
          />
          <div
            className="bg-stone-500"
            style={{ width: `${(stats.serieCount / stats.totalTyped) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
