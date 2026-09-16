import { useEffect, useMemo, useState } from "react";
import { Clapperboard, Loader2 } from "lucide-react";
import type { Genre, MediaItem, MediaStatus, MediaType, PostVisibility, User } from "./types";
import { resolvePrivacy } from "./types";
import { useAuthContext } from "./contexts/AuthContext";
import { useCatalog } from "./hooks/useCatalog";
import { useFriends } from "./hooks/useFriends";
import { useFeed, publishPost } from "./hooks/useFeed";
import { useNotifications } from "./hooks/useNotifications";
import { extractMentions, type MentionCandidate } from "./utils/mentions";
import { normalizeHandle } from "./utils/handle";
import { MediaFormModal, type MediaSeed, type WatchedWith, NO_WATCHED_WITH } from "./components/MediaFormModal";
import { ProfileModal } from "./components/ProfileModal";
import { PersonalDataModal } from "./components/PersonalDataModal";
import { GenrePreferencesModal } from "./components/GenrePreferencesModal";
import { PrivacySettingsModal } from "./components/PrivacySettingsModal";
import { ShareActivityModal } from "./components/ShareActivityModal";
import { PublicProfileModal } from "./components/PublicProfileModal";
import { PostDetailModal } from "./components/PostDetailModal";
import { AuthScreen } from "./components/AuthScreen";
import { MediaDetailsModal, type DetailsTarget } from "./components/MediaDetailsModal";
import { DesktopTabBar, MobileTabBar, type AppTab } from "./components/MainTabBar";
import { NotificationBell } from "./components/NotificationBell";
import { UserMenu } from "./components/UserMenu";
import { ProgramasTab } from "./components/ProgramasTab";
import { FeedTab } from "./components/FeedTab";
import { FriendsPanel } from "./components/FriendsPanel";
import { ExplorarTab } from "./components/ExplorarTab";
import { DashboardTab } from "./components/DashboardTab";
import {
  getDetails,
  getGenres,
  getPopular,
  getPosterUrl,
  getRecommendationsByGenres,
  getTrending,
  searchMulti,
  type TmdbMovie,
} from "./services/tmdb";

type TmdbMediaItem = TmdbMovie & { media_type: "movie" | "tv" };

export default function App() {
  const { authUser, profile, loading: authLoading, saveProfile, logOut } = useAuthContext();
  const { items, saveItem, updateStatus, updateRating, toggleFavorite, moveFavoriteRank, deleteItem, restoreItems } = useCatalog(
    authUser?.uid ?? null
  );

  const [activeTab, setActiveTab] = useState<AppTab>("explorar");

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MediaType | "Todos">("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [seedDraft, setSeedDraft] = useState<MediaSeed | null>(null);

  const [detailsTarget, setDetailsTarget] = useState<DetailsTarget | null>(null);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [personalDataModalOpen, setPersonalDataModalOpen] = useState(false);
  const [genresModalOpen, setGenresModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [publicProfileTarget, setPublicProfileTarget] = useState<string | null>(null);
  const [postDetailTarget, setPostDetailTarget] = useState<{ postId: string; commentId?: string } | null>(
    null
  );
  const [shareModalItem, setShareModalItem] = useState<MediaItem | null>(null);
  const [shareWatchedWith, setShareWatchedWith] = useState<WatchedWith>(NO_WATCHED_WITH);
  const [shareSubmitting, setShareSubmitting] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [genresLoading, setGenresLoading] = useState(true);

  const {
    accepted: friends,
    incoming: incomingFriendRequests,
    outgoing: outgoingFriendRequests,
    friendUids,
    otherUid: friendOtherUid,
    friendshipWith,
    sendRequest: sendFriendRequest,
    acceptRequest: acceptFriendRequest,
    declineRequest: declineFriendRequest,
    removeFriend,
  } = useFriends(authUser?.uid ?? null);

  const { posts: feedPosts, loading: feedLoading, trending: feedTrending } = useFeed(
    authUser?.uid ?? null,
    friendUids
  );

  // @mention candidates are always the CURRENT user's own friends — a
  // mention can only ever point at someone this account is connected to,
  // same trust boundary as the notification it creates (see firestore.rules).
  const mentionCandidates: MentionCandidate[] = useMemo(
    () =>
      friends
        .map((f): MentionCandidate | null => {
          const targetUid = friendOtherUid(f);
          const info = f.profiles[targetUid];
          if (!info?.handle) return null;
          return { uid: targetUid, name: info.name, handle: normalizeHandle(info.handle), avatarUrl: info.avatarUrl };
        })
        .filter((c): c is MentionCandidate => c !== null),
    [friends, friendOtherUid]
  );

  const {
    notifications,
    markRead: markNotificationRead,
    markAllRead: markAllNotificationsRead,
  } = useNotifications(authUser?.uid ?? null);

  const [trending, setTrending] = useState<TmdbMediaItem[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  const [popular, setPopular] = useState<TmdbMediaItem[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);

  const [personalizedMovies, setPersonalizedMovies] = useState<TmdbMediaItem[]>([]);
  const [personalizedMoviesLoading, setPersonalizedMoviesLoading] = useState(false);

  const [personalizedSeries, setPersonalizedSeries] = useState<TmdbMediaItem[]>([]);
  const [personalizedSeriesLoading, setPersonalizedSeriesLoading] = useState(false);

  const [tmdbResults, setTmdbResults] = useState<TmdbMediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>([]);
  const [discoverResults, setDiscoverResults] = useState<TmdbMediaItem[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  const isSearching = query.trim().length >= 2;

  useEffect(() => {
    getTrending()
      .then((results) => setTrending(results as TmdbMediaItem[]))
      .catch(() => setTrending([]))
      .finally(() => setTrendingLoading(false));

    getPopular("movie")
      .then((results) => setPopular(results as TmdbMediaItem[]))
      .catch(() => setPopular([]))
      .finally(() => setPopularLoading(false));

    getGenres()
      .then(setGenres)
      .catch(() => setGenres([]))
      .finally(() => setGenresLoading(false));
  }, []);

  useEffect(() => {
    if (authUser && profile && profile.favoriteGenreIds.length === 0) {
      setProfileModalOpen(true);
    }
  }, [authUser, profile]);

  function likedGenreIdsFor(mediaType: MediaType): number[] {
    const freq = new Map<number, number>();
    for (const item of items) {
      if (item.type === mediaType && item.status === "Visto" && item.rating >= 8) {
        for (const genreId of item.genreIds ?? []) {
          freq.set(genreId, (freq.get(genreId) ?? 0) + 1);
        }
      }
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([genreId]) => genreId)
      .slice(0, 6);
  }

  const likedMovieGenreIds = useMemo(() => likedGenreIdsFor("Filme"), [items]);
  const likedSeriesGenreIds = useMemo(() => likedGenreIdsFor("Série"), [items]);

  const hasMovieTasteSignal =
    likedMovieGenreIds.length > 0 || (profile?.favoriteGenreIds.length ?? 0) > 0;
  const hasSeriesTasteSignal =
    likedSeriesGenreIds.length > 0 || (profile?.favoriteGenreIds.length ?? 0) > 0;

  const finishedButUnmarked = useMemo(
    () =>
      items.filter(
        (item) =>
          item.status === "Assistindo" &&
          item.type === "Filme" &&
          Boolean(item.runtimeMinutes) &&
          (item.progressMinutes ?? 0) >= (item.runtimeMinutes ?? 0)
      ),
    [items]
  );

  useEffect(() => {
    const genreIds = likedMovieGenreIds.length > 0 ? likedMovieGenreIds : profile?.favoriteGenreIds ?? [];
    if (genreIds.length === 0) {
      setPersonalizedMovies([]);
      return;
    }

    let cancelled = false;
    const watchedTmdbIds = new Set(
      items.filter((item) => item.type === "Filme").map((item) => item.tmdbId).filter(Boolean)
    );

    setPersonalizedMoviesLoading(true);
    getRecommendationsByGenres(genreIds, "movie")
      .then((results) => {
        if (cancelled) return;
        setPersonalizedMovies(
          (results as TmdbMediaItem[]).filter((result) => !watchedTmdbIds.has(result.id))
        );
      })
      .catch(() => {
        if (!cancelled) setPersonalizedMovies([]);
      })
      .finally(() => {
        if (!cancelled) setPersonalizedMoviesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [likedMovieGenreIds, profile?.favoriteGenreIds, items]);

  useEffect(() => {
    const genreIds = likedSeriesGenreIds.length > 0 ? likedSeriesGenreIds : profile?.favoriteGenreIds ?? [];
    if (genreIds.length === 0) {
      setPersonalizedSeries([]);
      return;
    }

    let cancelled = false;
    const watchedTmdbIds = new Set(
      items.filter((item) => item.type === "Série").map((item) => item.tmdbId).filter(Boolean)
    );

    setPersonalizedSeriesLoading(true);
    getRecommendationsByGenres(genreIds, "tv")
      .then((results) => {
        if (cancelled) return;
        setPersonalizedSeries(
          (results as TmdbMediaItem[]).filter((result) => !watchedTmdbIds.has(result.id))
        );
      })
      .catch(() => {
        if (!cancelled) setPersonalizedSeries([]);
      })
      .finally(() => {
        if (!cancelled) setPersonalizedSeriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [likedSeriesGenreIds, profile?.favoriteGenreIds, items]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setTmdbResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    let cancelled = false;
    const handle = setTimeout(() => {
      searchMulti(trimmed)
        .then((results) => {
          if (!cancelled) setTmdbResults(results as TmdbMediaItem[]);
        })
        .catch((err) => {
          if (!cancelled) setSearchError(err instanceof Error ? err.message : "Erro na busca");
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  useEffect(() => {
    if (selectedGenreIds.length === 0) {
      setDiscoverResults([]);
      return;
    }

    let cancelled = false;
    setDiscoverLoading(true);
    Promise.all([
      getRecommendationsByGenres(selectedGenreIds, "movie"),
      getRecommendationsByGenres(selectedGenreIds, "tv"),
    ])
      .then(([movies, tvs]) => {
        if (!cancelled) setDiscoverResults([...movies, ...tvs] as TmdbMediaItem[]);
      })
      .catch(() => {
        if (!cancelled) setDiscoverResults([]);
      })
      .finally(() => {
        if (!cancelled) setDiscoverLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedGenreIds]);

  const filteredTmdbResults = useMemo(() => {
    return tmdbResults.filter((item) => {
      if (typeFilter === "Todos") return true;
      return typeFilter === "Filme" ? item.media_type === "movie" : item.media_type === "tv";
    });
  }, [tmdbResults, typeFilter]);

  function attemptShareOnWatched(item: MediaItem, prevStatus: MediaStatus | undefined, watchedWith: WatchedWith = NO_WATCHED_WITH) {
    if (!profile || !authUser) return;
    if (prevStatus === "Visto" || item.status !== "Visto") return; // only on the transition INTO Visto

    const { autoShareOnWatched, feedVisibility } = resolvePrivacy(profile);
    if (autoShareOnWatched) {
      publishActivity(item, feedVisibility, item.rating, item.review, watchedWith).catch((err) =>
        console.error("Falha ao publicar no feed:", err)
      );
    } else {
      setShareError(null);
      setShareModalItem(item);
      setShareWatchedWith(watchedWith);
    }
  }

  async function publishActivity(
    item: MediaItem,
    visibility: PostVisibility,
    rating = item.rating,
    review = item.review,
    watchedWith: WatchedWith = NO_WATCHED_WITH
  ): Promise<string> {
    if (!authUser || !profile) throw new Error("not-authenticated");
    const fromText = extractMentions(review, mentionCandidates);
    const mentionUids = new Set(fromText.mentions.map((m) => m.uid));
    const mentions = [...fromText.mentions];
    for (const m of watchedWith.mentions) {
      if (!mentionUids.has(m.uid)) {
        mentionUids.add(m.uid);
        mentions.push(m);
      }
    }
    const mentionsAll = fromText.mentionsAll || watchedWith.mentionsAll;

    // new_post + @mention notifications happen server-side inside the RPC,
    // atomically with the insert — nothing else to trigger here.
    return publishPost({
      tmdbId: item.tmdbId,
      mediaType: item.type === "Série" ? "tv" : "movie",
      type: item.type,
      title: item.title,
      coverUrl: item.coverUrl,
      rating,
      review,
      visibility,
      mentions,
      mentionsAll,
    });
  }

  function handleSave(item: MediaItem, watchedWith: WatchedWith = NO_WATCHED_WITH) {
    const prevStatus = editingItem?.id === item.id ? editingItem.status : items.find((i) => i.id === item.id)?.status;
    saveItem(item).catch((err) => console.error("Falha ao salvar item:", err));

    if (item.tmdbId && item.type === "Filme" && !item.runtimeMinutes) {
      getDetails(item.tmdbId, "movie")
        .then((details) => {
          if (details.runtime) {
            saveItem({ ...item, runtimeMinutes: details.runtime }).catch(() => {});
          }
        })
        .catch(() => {});
    }

    attemptShareOnWatched(item, prevStatus, watchedWith);
  }

  function handleStatusChange(id: string, status: MediaStatus) {
    const prevItem = items.find((i) => i.id === id);
    updateStatus(id, status).catch((err) => console.error("Falha ao atualizar status:", err));
    if (prevItem) attemptShareOnWatched({ ...prevItem, status }, prevItem.status);
  }

  function handleRatingChange(id: string, rating: number) {
    updateRating(id, rating).catch((err) => console.error("Falha ao avaliar:", err));
  }

  function handleToggleFavorite(id: string, isFavorite: boolean) {
    toggleFavorite(id, isFavorite).catch((err) => console.error("Falha ao favoritar:", err));
  }

  function handleMoveFavoriteRank(id: string, direction: "up" | "down") {
    moveFavoriteRank(id, direction).catch((err) => console.error("Falha ao reordenar favorito:", err));
  }

  function handleDelete(id: string) {
    deleteItem(id).catch((err) => console.error("Falha ao remover item:", err));
  }

  function handleRestore(restoredItems: MediaItem[]) {
    restoreItems(restoredItems).catch((err) => console.error("Falha ao restaurar dados:", err));
  }

  function openEditModal(item: MediaItem) {
    setEditingItem(item);
    setSeedDraft(null);
    setModalOpen(true);
  }

  function handleQuickAdd(tmdbItem: TmdbMovie) {
    setEditingItem(null);
    setSeedDraft({
      title: tmdbItem.title ?? tmdbItem.name ?? "",
      type: tmdbItem.media_type === "tv" ? "Série" : "Filme",
      coverUrl: getPosterUrl(tmdbItem.poster_path) ?? "",
      tmdbId: tmdbItem.id,
      genreIds: tmdbItem.genre_ids,
    });
    setModalOpen(true);
  }

  function openDetails(item: TmdbMediaItem) {
    setDetailsTarget({ tmdbId: item.id, mediaType: item.media_type });
  }

  function openDetailsFromCatalog(item: MediaItem) {
    if (!item.tmdbId) return;
    setDetailsTarget({ tmdbId: item.tmdbId, mediaType: item.type === "Série" ? "tv" : "movie" });
  }

  function toggleGenre(id: number) {
    setSelectedGenreIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }

  function closeModal() {
    setModalOpen(false);
    setEditingItem(null);
    setSeedDraft(null);
  }

  function handleSaveProfile(user: User) {
    saveProfile(user).catch((err) => console.error("Falha ao salvar perfil:", err));
  }

  function handleSendFriendRequest(targetUid: string) {
    if (!profile) return;
    sendFriendRequest(targetUid).catch((err) => console.error("Falha ao enviar solicitação:", err));
  }

  function isRequestedByMe(f: { requestedBy: string }) {
    return f.requestedBy === authUser?.uid;
  }

  async function handleShare(rating: number, review: string, visibility: PostVisibility) {
    if (!shareModalItem) return;
    setShareSubmitting(true);
    setShareError(null);
    try {
      await publishActivity(shareModalItem, visibility, rating, review, shareWatchedWith);
      if (rating !== shareModalItem.rating || review !== shareModalItem.review) {
        saveItem({ ...shareModalItem, rating, review }).catch(() => {});
      }
      setShareModalItem(null);
      setShareWatchedWith(NO_WATCHED_WITH);
    } catch (err) {
      console.error("Falha ao publicar no feed:", err);
      setShareError("Não foi possível compartilhar agora. Tente de novo em instantes.");
    } finally {
      setShareSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0e0c0a]">
        <Loader2 className="animate-spin text-[#a32638]" size={28} />
      </div>
    );
  }

  if (!profile || !authUser) {
    return <AuthScreen backdropPath={trending[0]?.backdrop_path ?? null} />;
  }

  return (
    <div className="min-h-screen bg-[#0e0c0a] pb-20 sm:pb-8">
      <header className="sticky top-0 z-30 border-b border-stone-900 bg-[#0e0c0a]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Clapperboard className="text-[#a32638]" size={20} />
            <span className="font-display text-lg font-semibold tracking-tight text-white sm:text-xl">
              Catalog
            </span>
          </div>

          <DesktopTabBar active={activeTab} onChange={setActiveTab} />

          <div className="flex items-center gap-2">
            <NotificationBell
              pendingItems={finishedButUnmarked}
              onMarkWatched={(id) => handleStatusChange(id, "Visto")}
              incomingFriendRequests={incomingFriendRequests}
              onAcceptFriend={(id) => acceptFriendRequest(id).catch((err) => console.error("Falha ao aceitar:", err))}
              onDeclineFriend={(id) => declineFriendRequest(id).catch((err) => console.error("Falha ao recusar:", err))}
              notifications={notifications}
              onOpenPost={(postId, commentId) => setPostDetailTarget({ postId, commentId })}
              onMarkNotificationRead={(id) => markNotificationRead(id).catch(() => {})}
              onMarkAllNotificationsRead={() => markAllNotificationsRead().catch(() => {})}
            />

            <UserMenu
              profile={profile}
              items={items}
              onOpenPersonalData={() => setPersonalDataModalOpen(true)}
              onOpenGenres={() => setGenresModalOpen(true)}
              onOpenPrivacy={() => setPrivacyModalOpen(true)}
              onRestore={handleRestore}
              onLogout={() => logOut().catch((err) => console.error("Falha ao sair:", err))}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        {activeTab === "programas" && (
          <ProgramasTab
            items={items}
            genres={genres}
            onStatusChange={handleStatusChange}
            onRatingChange={handleRatingChange}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onOpenDetails={openDetailsFromCatalog}
            onToggleFavorite={handleToggleFavorite}
            onMoveFavoriteRank={handleMoveFavoriteRank}
          />
        )}

        {activeTab === "feed" && (
          <FeedTab
            uid={authUser.uid}
            posts={feedPosts}
            feedLoading={feedLoading}
            trending={feedTrending}
            mentionCandidates={mentionCandidates}
            onOpenProfile={setPublicProfileTarget}
            onOpenDetails={setDetailsTarget}
          />
        )}

        {activeTab === "amigos" && (
          <div className="space-y-5">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">Amigos</h1>
            <FriendsPanel
              uid={authUser.uid}
              myProfile={{ name: profile.name, avatarUrl: profile.avatarUrl, handle: profile.handle }}
              accepted={friends}
              incoming={incomingFriendRequests}
              outgoing={outgoingFriendRequests}
              otherUid={friendOtherUid}
              friendshipWith={friendshipWith}
              onSendRequest={handleSendFriendRequest}
              onAccept={(id) => acceptFriendRequest(id).catch((err) => console.error("Falha ao aceitar:", err))}
              onDecline={(id) => declineFriendRequest(id).catch((err) => console.error("Falha ao recusar:", err))}
              onRemove={(id) => removeFriend(id).catch((err) => console.error("Falha ao remover amigo:", err))}
              onOpenProfile={setPublicProfileTarget}
            />
          </div>
        )}

        {activeTab === "explorar" && (
          <ExplorarTab
            query={query}
            onQueryChange={setQuery}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            isSearching={isSearching}
            tmdbResults={filteredTmdbResults}
            searchLoading={searchLoading}
            searchError={searchError}
            genres={genres}
            selectedGenreIds={selectedGenreIds}
            onToggleGenre={toggleGenre}
            discoverResults={discoverResults}
            discoverLoading={discoverLoading}
            trending={trending}
            trendingLoading={trendingLoading}
            popular={popular}
            popularLoading={popularLoading}
            personalizedMovies={personalizedMovies}
            personalizedMoviesLoading={personalizedMoviesLoading}
            personalizedSeries={personalizedSeries}
            personalizedSeriesLoading={personalizedSeriesLoading}
            hasMovieFavorites={hasMovieTasteSignal}
            hasSeriesFavorites={hasSeriesTasteSignal}
            onAdd={handleQuickAdd}
            onOpenDetails={openDetails}
          />
        )}

        {activeTab === "dashboard" && <DashboardTab items={items} genres={genres} />}
      </main>

      <MobileTabBar active={activeTab} onChange={setActiveTab} />

      <MediaFormModal
        open={modalOpen}
        onClose={closeModal}
        onSave={handleSave}
        mentionCandidates={mentionCandidates}
        initialItem={editingItem}
        seed={seedDraft}
      />

      <MediaDetailsModal
        target={detailsTarget}
        onClose={() => setDetailsTarget(null)}
        onQuickAdd={handleQuickAdd}
        catalogItem={items.find((i) => i.tmdbId === detailsTarget?.tmdbId) ?? null}
      />

      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onSave={handleSaveProfile}
        initialUser={profile}
        genres={genres}
        genresLoading={genresLoading}
        dismissible={Boolean(profile)}
      />

      <PersonalDataModal
        open={personalDataModalOpen}
        onClose={() => setPersonalDataModalOpen(false)}
        profile={profile}
        onSave={handleSaveProfile}
      />

      <GenrePreferencesModal
        open={genresModalOpen}
        onClose={() => setGenresModalOpen(false)}
        profile={profile}
        genres={genres}
        genresLoading={genresLoading}
        onSave={handleSaveProfile}
      />

      <PrivacySettingsModal
        open={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
        profile={profile}
        onSave={handleSaveProfile}
      />

      <ShareActivityModal
        item={shareModalItem}
        defaultVisibility={resolvePrivacy(profile).feedVisibility}
        mentionCandidates={mentionCandidates}
        watchedWith={shareWatchedWith}
        submitting={shareSubmitting}
        error={shareError}
        onShare={handleShare}
        onSkip={() => {
          setShareModalItem(null);
          setShareWatchedWith(NO_WATCHED_WITH);
          setShareError(null);
        }}
      />

      <PublicProfileModal
        targetUid={publicProfileTarget}
        currentUid={authUser.uid}
        genres={genres}
        friendshipWith={friendshipWith}
        isRequestedByMe={isRequestedByMe}
        onSendRequest={handleSendFriendRequest}
        onAccept={(id) => acceptFriendRequest(id).catch((err) => console.error("Falha ao aceitar:", err))}
        onCancelOrDecline={(id) => declineFriendRequest(id).catch((err) => console.error("Falha:", err))}
        onRemove={(id) => removeFriend(id).catch((err) => console.error("Falha ao remover amigo:", err))}
        onClose={() => setPublicProfileTarget(null)}
        onOpenDetails={setDetailsTarget}
      />

      <PostDetailModal
        postId={postDetailTarget?.postId ?? null}
        highlightCommentId={postDetailTarget?.commentId}
        currentUid={authUser.uid}
        mentionCandidates={mentionCandidates}
        onClose={() => setPostDetailTarget(null)}
        onOpenProfile={setPublicProfileTarget}
        onOpenDetails={setDetailsTarget}
      />
    </div>
  );
}
