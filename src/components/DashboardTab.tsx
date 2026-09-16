import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { BarChart3, Bookmark, Clock, Eye, Sparkles, Star } from "lucide-react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import type { Genre, MediaItem } from "../types";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

interface DashboardTabProps {
  items: MediaItem[];
  genres: Genre[];
}

const FALLBACK_MOVIE_MINUTES = 110;
const FALLBACK_SERIES_MINUTES = 300;

const RED = "#a32638";
const RED_SOFT = "#dc4b5f";
const GRID_COLOR = "rgba(214, 211, 209, 0.08)";
const TEXT_MUTED = "#a8a29e";

type Period = "mes" | "ano" | "tudo";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "mes", label: "Mês" },
  { value: "ano", label: "Ano" },
  { value: "tudo", label: "Todo o período" },
];

function formatMinutes(total: number): string {
  if (total <= 0) return "0min";
  const hours = Math.floor(total / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${total % 60}min`;
  return `${total}min`;
}

function filterByPeriod(items: MediaItem[], period: Period): MediaItem[] {
  if (period === "tudo") return items;
  const now = new Date();
  return items.filter((item) => {
    const d = new Date(item.createdAt);
    if (period === "ano") return d.getFullYear() === now.getFullYear();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
}

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function buildEvolutionData(visto: MediaItem[], period: Period) {
  if (period === "mes") {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const counts = new Array(daysInMonth).fill(0);
    for (const item of visto) {
      const d = new Date(item.createdAt);
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
        counts[d.getDate() - 1] += 1;
      }
    }
    return { labels: counts.map((_, i) => `${i + 1}`), data: counts };
  }

  if (period === "ano") {
    const now = new Date();
    const counts = new Array(12).fill(0);
    for (const item of visto) {
      const d = new Date(item.createdAt);
      if (d.getFullYear() === now.getFullYear()) counts[d.getMonth()] += 1;
    }
    return { labels: MONTH_LABELS, data: counts };
  }

  if (visto.length === 0) return { labels: [], data: [] };
  const byKey = new Map<string, number>();
  for (const item of visto) {
    const d = new Date(item.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    byKey.set(key, (byKey.get(key) ?? 0) + 1);
  }
  const sortedKeys = [...byKey.keys()].sort((a, b) => {
    const [ya, ma] = a.split("-").map(Number);
    const [yb, mb] = b.split("-").map(Number);
    return ya - yb || ma - mb;
  });
  const labels = sortedKeys.map((k) => {
    const [y, m] = k.split("-").map(Number);
    return `${MONTH_LABELS[m]}/${String(y).slice(2)}`;
  });
  const data = sortedKeys.map((k) => byKey.get(k) ?? 0);
  return { labels, data };
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 text-center transition-colors hover:border-stone-700">
      <Icon size={18} className="mx-auto mb-2 text-[#a32638]" />
      <p className="text-2xl font-extrabold text-white">{value}</p>
      <p className="text-xs text-stone-500">{label}</p>
    </div>
  );
}

function ChartCard({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5">
      <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-stone-400">
        <Icon size={14} /> {title}
      </div>
      <div className="relative h-64 w-full">{children}</div>
    </div>
  );
}

export function DashboardTab({ items, genres }: DashboardTabProps) {
  const [period, setPeriod] = useState<Period>("tudo");

  const filteredItems = useMemo(() => filterByPeriod(items, period), [items, period]);

  const stats = useMemo(() => {
    const visto = filteredItems.filter((i) => i.status === "Visto");
    const assistindo = filteredItems.filter((i) => i.status === "Assistindo");
    const queroVer = filteredItems.filter((i) => i.status === "Quero Ver");

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
    const topGenres = [...genreCounts.entries()]
      .map(([gid, count]) => ({ name: genres.find((g) => g.id === gid)?.name ?? "?", count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const filmeCount = filteredItems.filter((i) => i.type === "Filme").length;
    const serieCount = filteredItems.filter((i) => i.type === "Série").length;

    const ratedItems = visto.filter((i) => i.rating > 0);
    const avgRating =
      ratedItems.length > 0 ? ratedItems.reduce((sum, i) => sum + i.rating, 0) / ratedItems.length : 0;

    const evolution = buildEvolutionData(visto, period);

    return {
      visto: visto.length,
      assistindo: assistindo.length,
      queroVer: queroVer.length,
      totalMinutes,
      topGenres,
      filmeCount,
      serieCount,
      avgRating,
      ratedCount: ratedItems.length,
      evolution,
    };
  }, [filteredItems, genres, period]);

  const doughnutData = {
    labels: ["Filmes", "Séries"],
    datasets: [
      {
        data: [stats.filmeCount, stats.serieCount],
        backgroundColor: [RED, "#78716c"],
        borderColor: "#0c0a09",
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const barData = {
    labels: stats.topGenres.map((g) => g.name),
    datasets: [
      {
        label: "Títulos vistos",
        data: stats.topGenres.map((g) => g.count),
        backgroundColor: RED_SOFT,
        borderRadius: 6,
        maxBarThickness: 22,
      },
    ],
  };

  const lineData = {
    labels: stats.evolution.labels,
    datasets: [
      {
        label: "Assistidos",
        data: stats.evolution.data,
        borderColor: RED,
        backgroundColor: "rgba(163, 38, 56, 0.25)",
        pointBackgroundColor: RED,
        pointRadius: 3,
        tension: 0.35,
        fill: true,
      },
    ],
  };

  const tooltipStyle = {
    backgroundColor: "#1c1917",
    borderColor: "#44403c",
    borderWidth: 1,
    titleColor: "#fafaf9",
    bodyColor: "#d6d3d1",
    padding: 10,
    displayColors: false,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">Estatísticas</h1>
        <div className="flex overflow-hidden rounded-full border border-stone-800 bg-stone-900/60 text-xs">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                period === opt.value ? "bg-[#a32638] text-white" : "text-stone-400 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Visto" value={stats.visto} icon={Eye} />
        <StatCard label="Assistindo" value={stats.assistindo} icon={Clock} />
        <StatCard label="Quero Ver" value={stats.queroVer} icon={Bookmark} />
        <StatCard label="Tempo Assistido" value={formatMinutes(stats.totalMinutes)} icon={Clock} />
        <StatCard
          label="Nota Média"
          value={stats.ratedCount > 0 ? `${stats.avgRating.toFixed(1)}/10` : "—"}
          icon={Star}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Filmes vs Séries" icon={BarChart3}>
          {stats.filmeCount + stats.serieCount > 0 ? (
            <Doughnut
              data={doughnutData}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "bottom", labels: { color: TEXT_MUTED, usePointStyle: true, padding: 16 } },
                  tooltip: tooltipStyle,
                },
              }}
            />
          ) : (
            <EmptyState />
          )}
        </ChartCard>

        <ChartCard title="Gêneros Mais Consumidos" icon={Sparkles}>
          {stats.topGenres.length > 0 ? (
            <Bar
              data={barData}
              options={{
                indexAxis: "y",
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: tooltipStyle },
                scales: {
                  x: { ticks: { color: TEXT_MUTED, precision: 0 }, grid: { color: GRID_COLOR } },
                  y: { ticks: { color: TEXT_MUTED }, grid: { display: false } },
                },
              }}
            />
          ) : (
            <EmptyState />
          )}
        </ChartCard>
      </div>

      <ChartCard title="Evolução de Consumo" icon={Clock}>
        {stats.evolution.data.some((n) => n > 0) ? (
          <Line
            data={lineData}
            options={{
              maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: tooltipStyle },
              scales: {
                x: { ticks: { color: TEXT_MUTED, maxRotation: 0, autoSkip: true }, grid: { display: false } },
                y: {
                  ticks: { color: TEXT_MUTED, precision: 0 },
                  grid: { color: GRID_COLOR },
                  beginAtZero: true,
                },
              },
            }}
          />
        ) : (
          <EmptyState />
        )}
      </ChartCard>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-stone-500">Sem dados neste período.</div>
  );
}
