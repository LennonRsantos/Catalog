import { useEffect, useMemo, useState } from "react";
import { Clapperboard, Pencil, ShieldCheck, Sparkles, Tv, User as UserIcon } from "lucide-react";
import type { FavoriteEntry, Genre, MediaItem, User } from "../types";
import { resolvePrivacy } from "../types";
import type { DetailsTarget } from "./MediaDetailsModal";
import { Top10Row } from "./PublicProfileModal";
import { DashboardTab } from "./DashboardTab";
import { fetchFollowCounts } from "../hooks/useFollows";

interface ProfileTabProps {
  uid: string;
  profile: User;
  items: MediaItem[];
  genres: Genre[];
  onOpenDetails: (target: DetailsTarget) => void;
  onOpenPersonalData: () => void;
  onOpenGenres: () => void;
  onOpenPrivacy: () => void;
}

const VISIBILITY_LABEL = { public: "Público", friends: "Amigos", private: "Privado" } as const;

// Own favorites, computed directly from the local catalog — unlike
// PublicProfileModal's fetchTop10, there's no privacy boundary to cross
// (favorites_public is for OTHER people's catalogs), so no network round trip.
function ownTop10(items: MediaItem[], type: MediaItem["type"]): FavoriteEntry[] {
  const favorites = items.filter((i) => i.type === type && i.isFavorite);
  favorites.sort((a, b) => {
    const rankA = a.favoriteRank ?? Infinity;
    const rankB = b.favoriteRank ?? Infinity;
    if (rankA !== rankB) return rankA - rankB;
    return b.createdAt - a.createdAt;
  });
  return favorites.slice(0, 10).map((item) => ({
    id: item.id,
    tmdbId: item.tmdbId,
    mediaType: item.type === "Série" ? "tv" : "movie",
    type: item.type,
    title: item.title,
    coverUrl: item.coverUrl,
    rating: item.rating,
    ratedAt: item.createdAt,
    favoriteRank: item.favoriteRank,
  }));
}

export function ProfileTab({
  uid,
  profile,
  items,
  genres,
  onOpenDetails,
  onOpenPersonalData,
  onOpenGenres,
  onOpenPrivacy,
}: ProfileTabProps) {
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const { profileVisibility } = resolvePrivacy(profile);

  useEffect(() => {
    let cancelled = false;
    fetchFollowCounts(uid)
      .then((counts) => {
        if (!cancelled) setFollowCounts(counts);
      })
      .catch(() => {
        if (!cancelled) setFollowCounts({ followers: 0, following: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const topMovies = useMemo(() => ownTop10(items, "Filme"), [items]);
  const topSeries = useMemo(() => ownTop10(items, "Série"), [items]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">Perfil</h1>

      <div className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-900">
        <div className="relative h-28 w-full sm:h-36">
          {profile.coverUrl ? (
            <img src={profile.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-linear-to-br from-stone-800 via-stone-900 to-stone-950" />
          )}

          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-stone-900 bg-stone-950">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
              ) : (
                <UserIcon size={36} className="text-stone-700" />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 px-6 pb-6 pt-14">
          <div className="flex flex-col items-center gap-3 text-center">
            <div>
              <h2 className="text-lg font-bold text-white">{profile.name}</h2>
              <p className="text-xs text-stone-500">{profile.handle}</p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="text-stone-300">
                <strong className="font-semibold text-white">{followCounts.followers}</strong>{" "}
                <span className="text-stone-500">seguidores</span>
              </span>
              <span className="text-stone-300">
                <strong className="font-semibold text-white">{followCounts.following}</strong>{" "}
                <span className="text-stone-500">seguindo</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={onOpenPersonalData}
                className="flex items-center gap-1.5 rounded-full bg-[#a32638] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#bd3347]"
              >
                <Pencil size={13} /> Editar Perfil
              </button>
              <button
                onClick={onOpenPrivacy}
                className="flex items-center gap-1.5 rounded-full border border-stone-700 px-4 py-2 text-xs font-medium text-stone-400 transition hover:text-white"
              >
                <ShieldCheck size={13} /> {VISIBILITY_LABEL[profileVisibility]}
              </button>
            </div>
          </div>

          <div className="border-t border-stone-800 pt-5">
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                <Sparkles size={14} className="text-[#a32638]" />
                Gêneros Favoritos
              </h3>
              <button onClick={onOpenGenres} className="text-[11px] font-medium text-[#bd3347] hover:text-[#d97a86]">
                Editar
              </button>
            </div>
            {profile.favoriteGenreIds.length === 0 ? (
              <p className="rounded-lg border border-dashed border-stone-800 px-3 py-4 text-center text-xs text-stone-500">
                Nenhuma preferência de gênero definida.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.favoriteGenreIds.map((id) => {
                  const name = genres.find((g) => g.id === id)?.name;
                  if (!name) return null;
                  return (
                    <span
                      key={id}
                      className="rounded-full border border-[#a32638]/40 bg-[#a32638]/10 px-3 py-1.5 text-xs font-medium text-[#d97a86]"
                    >
                      {name}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-5 border-t border-stone-800 pt-5">
            <Top10Row
              icon={Clapperboard}
              title="Top 10 Filmes"
              entries={topMovies}
              emptyMessage="Marque filmes como favoritos para vê-los aqui."
              onOpenDetails={onOpenDetails}
            />
            <Top10Row
              icon={Tv}
              title="Top 10 Séries"
              entries={topSeries}
              emptyMessage="Marque séries como favoritas para vê-las aqui."
              onOpenDetails={onOpenDetails}
            />
          </div>
        </div>
      </div>

      <DashboardTab items={items} genres={genres} />
    </div>
  );
}
