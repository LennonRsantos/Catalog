import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import {
  Check,
  Clapperboard,
  Loader2,
  Star,
  Tv,
  User as UserIcon,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { db } from "../services/firebase";
import type { DetailsTarget } from "./MediaDetailsModal";
import type { FavoriteEntry, Friendship, Post, PublicProfile } from "../types";
import { DEFAULT_COVER } from "../types";
import { PostCard } from "./PostCard";
import { useEscapeClose } from "../hooks/useEscapeClose";

interface PublicProfileModalProps {
  targetUid: string | null;
  currentUid: string;
  currentUserInfo: { name: string; avatarUrl?: string };
  friendshipWith: (targetUid: string) => Friendship | undefined;
  isRequestedByMe: (f: Friendship) => boolean;
  onSendRequest: (targetUid: string, targetProfile: { name: string; avatarUrl?: string; handle?: string }) => void;
  onAccept: (id: string) => void;
  onCancelOrDecline: (id: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  onOpenDetails: (target: DetailsTarget) => void;
}

// Sorted client-side (not via Firestore orderBy) so unranked favorites
// (favoriteRank undefined — 11th+ ones, or never assigned a slot) are still
// included instead of being excluded by an orderBy on a missing field.
async function fetchTop10(uid: string, type: "Filme" | "Série"): Promise<FavoriteEntry[]> {
  const q = query(collection(db, "profiles", uid, "favorites"), where("type", "==", type));
  const snap = await getDocs(q);
  const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FavoriteEntry);
  entries.sort((a, b) => {
    const rankA = a.favoriteRank ?? Infinity;
    const rankB = b.favoriteRank ?? Infinity;
    if (rankA !== rankB) return rankA - rankB;
    return b.ratedAt - a.ratedAt;
  });
  return entries.slice(0, 10);
}

function Top10Row({
  icon: Icon,
  title,
  entries,
  emptyMessage,
  onOpenDetails,
}: {
  icon: typeof Clapperboard;
  title: string;
  entries: FavoriteEntry[];
  emptyMessage: string;
  onOpenDetails: (target: DetailsTarget) => void;
}) {
  return (
    <section className="space-y-2.5">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
        <Icon size={14} className="text-[#a32638]" />
        {title}
      </h3>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-800 px-3 py-6 text-center text-xs text-stone-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
          {entries.map((entry, i) => (
            <button
              key={entry.id}
              onClick={() =>
                entry.tmdbId && onOpenDetails({ tmdbId: entry.tmdbId, mediaType: entry.mediaType })
              }
              disabled={!entry.tmdbId}
              className="w-24 shrink-0 text-left sm:w-28"
            >
              <div className="relative overflow-hidden rounded-lg">
                <img
                  src={entry.coverUrl}
                  alt={entry.title}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = DEFAULT_COVER;
                  }}
                  className="aspect-2/3 w-full object-cover"
                />
                <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/80 text-[10px] font-bold text-white backdrop-blur">
                  {i + 1}º
                </span>
                <span className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded-full bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-[#d9a441] backdrop-blur">
                  <Star size={9} className="fill-[#d9a441]" /> {entry.rating}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-stone-300">{entry.title}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function PublicProfileModal({
  targetUid,
  currentUid,
  currentUserInfo,
  friendshipWith,
  isRequestedByMe,
  onSendRequest,
  onAccept,
  onCancelOrDecline,
  onRemove,
  onClose,
  onOpenDetails,
}: PublicProfileModalProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [topMovies, setTopMovies] = useState<FavoriteEntry[]>([]);
  const [topSeries, setTopSeries] = useState<FavoriteEntry[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);

  const friendship = targetUid ? friendshipWith(targetUid) : undefined;
  const isFriend = friendship?.status === "accepted";

  useEffect(() => {
    if (!targetUid) return;
    setLoading(true);
    getDoc(doc(db, "publicProfiles", targetUid))
      .then((snap) => setProfile(snap.exists() ? (snap.data() as PublicProfile) : null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [targetUid]);

  useEffect(() => {
    if (!targetUid) return;
    const visibility = isFriend ? "friends" : "public";
    const q = query(
      collection(db, "posts"),
      where("authorUid", "==", targetUid),
      where("visibility", "==", visibility),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    return onSnapshot(q, (snap) => setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post)));
  }, [targetUid, isFriend]);

  useEffect(() => {
    if (!targetUid) return;
    setFavoritesLoading(true);
    setTopMovies([]);
    setTopSeries([]);
    Promise.all([fetchTop10(targetUid, "Filme"), fetchTop10(targetUid, "Série")])
      .then(([movies, series]) => {
        setTopMovies(movies);
        setTopSeries(series);
      })
      // Most likely a privacy denial (private profile, not friends) — same
      // honest-enough fallback as the posts query above: show the regular
      // empty state rather than a scary error.
      .catch(() => {
        setTopMovies([]);
        setTopSeries([]);
      })
      .finally(() => setFavoritesLoading(false));
  }, [targetUid, isFriend]);

  useEscapeClose(onClose, Boolean(targetUid));
  if (!targetUid) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-2xl border border-stone-800 bg-stone-900 p-6 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-end">
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-800 hover:text-white"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-stone-500">
            <Loader2 className="animate-spin" size={16} /> Carregando…
          </div>
        ) : !profile ? (
          <p className="py-10 text-center text-sm text-stone-500">Perfil indisponível.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-stone-800 bg-stone-950">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  <UserIcon size={36} className="text-stone-700" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{profile.name}</h2>
                <p className="text-xs text-stone-500">{profile.handle}</p>
              </div>

              {targetUid !== currentUid && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {!friendship && (
                    <button
                      onClick={() =>
                        onSendRequest(targetUid, {
                          name: profile.name,
                          avatarUrl: profile.avatarUrl,
                          handle: profile.handle,
                        })
                      }
                      className="flex items-center gap-1.5 rounded-full bg-[#a32638] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#bd3347]"
                    >
                      <UserPlus size={13} /> Adicionar
                    </button>
                  )}
                  {friendship?.status === "pending" && isRequestedByMe(friendship) && (
                    <button
                      onClick={() => onCancelOrDecline(friendship.id)}
                      className="flex items-center gap-1.5 rounded-full border border-stone-700 px-4 py-2 text-xs font-medium text-stone-400 transition hover:text-white"
                    >
                      Cancelar solicitação
                    </button>
                  )}
                  {friendship?.status === "pending" && !isRequestedByMe(friendship) && (
                    <>
                      <span className="rounded-full border border-stone-700 px-4 py-2 text-xs font-medium text-stone-400">
                        Solicitação recebida
                      </span>
                      <button
                        onClick={() => onAccept(friendship.id)}
                        className="flex items-center gap-1.5 rounded-full bg-[#a32638] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#bd3347]"
                      >
                        <Check size={13} /> Aceitar
                      </button>
                      <button
                        onClick={() => onCancelOrDecline(friendship.id)}
                        className="rounded-full border border-stone-700 px-4 py-2 text-xs font-medium text-stone-400 transition hover:text-white"
                      >
                        Recusar
                      </button>
                    </>
                  )}
                  {isFriend && friendship && (
                    <>
                      <span className="flex items-center gap-1.5 rounded-full bg-stone-800 px-4 py-2 text-xs font-medium text-stone-300">
                        <UserCheck size={13} /> Amigos
                      </span>
                      <button
                        onClick={() => {
                          if (window.confirm(`Remover ${profile.name} da sua lista de amigos?`)) {
                            onRemove(friendship.id);
                          }
                        }}
                        aria-label="Remover amigo"
                        className="flex items-center gap-1.5 rounded-full border border-stone-700 px-3 py-2 text-xs font-medium text-stone-400 transition hover:border-red-900 hover:text-[#d97a86]"
                      >
                        <UserMinus size={13} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-stone-800 pt-5">
              {favoritesLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-stone-500">
                  <Loader2 className="animate-spin" size={14} /> Carregando favoritos…
                </div>
              ) : (
                <div className="space-y-5">
                  <Top10Row
                    icon={Clapperboard}
                    title="Top 10 Filmes"
                    entries={topMovies}
                    emptyMessage="Este usuário ainda não possui filmes favoritos para recomendar."
                    onOpenDetails={onOpenDetails}
                  />
                  <Top10Row
                    icon={Tv}
                    title="Top 10 Séries"
                    entries={topSeries}
                    emptyMessage="Este usuário ainda não possui séries favoritas para recomendar."
                    onOpenDetails={onOpenDetails}
                  />
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-stone-800 pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Atividades Recentes
              </h3>
              {posts.length === 0 ? (
                <p className="rounded-lg border border-dashed border-stone-800 px-3 py-8 text-center text-xs text-stone-500">
                  Nenhuma atividade visível.
                </p>
              ) : (
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUid={currentUid}
                    currentUserInfo={currentUserInfo}
                    onOpenProfile={() => {}}
                    onOpenDetails={onOpenDetails}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
