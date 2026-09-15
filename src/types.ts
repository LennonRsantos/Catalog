export type MediaType = "Filme" | "Série";

export type MediaStatus = "Quero Ver" | "Assistindo" | "Visto";

export interface MediaItem {
  id: string;
  tmdbId?: number;
  title: string;
  type: MediaType;
  status: MediaStatus;
  rating: number; // 0-10 points (5-star display, half-star granularity), 0 = sem nota
  review: string;
  coverUrl: string;
  createdAt: number;
  genreIds?: number[];
  runtimeMinutes?: number;
  progressSeason?: number;
  progressMinutes?: number;
  progressSeconds?: number; // 0-59, remainder past progressMinutes
  // Explicit "this is a favorite" flag — a deliberate choice, independent of
  // rating/status. favoriteRank is a sparse 1-10 slot assigned when marked;
  // unranked favorites (11th+, or slots never filled) stay undefined and
  // sort after the ranked ones. See useCatalog.ts's toggleFavorite/moveFavoriteRank.
  isFavorite?: boolean;
  favoriteRank?: number;
}

export interface Genre {
  id: number;
  name: string;
}

export type UserRole = "admin" | "user";

export type ProfileVisibility = "public" | "friends" | "private";
export type PostVisibility = "public" | "friends" | "private";

export interface User {
  name: string;
  email: string;
  favoriteGenreIds: number[];
  role: UserRole;
  avatarUrl?: string;
  coverUrl?: string; // banner shown behind the avatar on the profile
  birthdate?: string; // ISO "YYYY-MM-DD"
  // Stable handle assigned at signup (e.g. "@L7nnoca") for finding this
  // person, sending friend requests, and @mentioning them in posts/
  // comments — unlike name, it's unique-ish and never changes. Optional so
  // profiles predating this feature keep working until backfilled on next
  // login (see useAuth.ts).
  handle?: string;
  // Privacy — optional so existing profiles predating this feature keep working.
  // Always read through resolvePrivacy(profile), never these fields directly.
  profileVisibility?: ProfileVisibility;
  feedVisibility?: PostVisibility;
  autoShareOnWatched?: boolean;
  // One-time migration marker: ratings moved from a 0-5 to a 0-10 scale.
  // See useAuth.ts's ensureProfile — set once existing catalog items/posts
  // have been multiplied by 2, so it never runs twice for the same account.
  ratingsMigratedV2?: boolean;
}

export const DEFAULT_PROFILE_VISIBILITY: ProfileVisibility = "friends";
export const DEFAULT_FEED_VISIBILITY: PostVisibility = "friends";

export function resolvePrivacy(profile: User) {
  return {
    profileVisibility: profile.profileVisibility ?? DEFAULT_PROFILE_VISIBILITY,
    feedVisibility: profile.feedVisibility ?? DEFAULT_FEED_VISIBILITY,
    autoShareOnWatched: profile.autoShareOnWatched ?? false,
  };
}

// Denormalized copy of a catalog item explicitly marked isFavorite, kept in
// profiles/{uid}/favorites so a friend's Top 10 can be shown without
// exposing the rest of their catalog. See useCatalog.ts's syncFavoriteSnapshot.
export interface FavoriteEntry {
  id: string; // same id as the source catalog item
  tmdbId?: number;
  mediaType: "movie" | "tv";
  type: MediaType;
  title: string;
  coverUrl: string;
  rating: number;
  ratedAt: number;
  favoriteRank?: number;
}

// A resolved @mention, stored on the post/comment so any viewer can render
// it as a link without needing the author's own friend list (which only
// the author's client has). See utils/mentions.ts.
export interface PostMention {
  uid: string;
  handle: string; // "@"-prefixed
  name: string; // denormalized so "assistiu com X" can render without a lookup
}

export interface Post {
  id: string;
  authorUid: string;
  authorName: string;
  authorAvatarUrl?: string;
  tmdbId?: number;
  mediaType: "movie" | "tv";
  type: MediaType;
  title: string;
  coverUrl: string;
  rating: number; // 0-10 points, same scale as MediaItem.rating
  review: string;
  visibility: PostVisibility;
  createdAt: number;
  likeCount: number;
  commentCount: number;
  mentions?: PostMention[];
  mentionsAll?: boolean; // review used the special "@todos" mention
}

export interface PostComment {
  id: string;
  authorUid: string;
  authorName: string;
  authorAvatarUrl?: string;
  text: string;
  createdAt: number;
  editedAt?: number;
  mentions?: PostMention[];
  mentionsAll?: boolean;
}

export type NotificationType = "new_post" | "like" | "comment" | "mention";

export interface AppNotification {
  id: string;
  type: NotificationType;
  actorUid: string;
  actorName: string;
  actorAvatarUrl?: string;
  postId: string;
  postTitle: string;
  postCoverUrl: string;
  commentId?: string;
  commentPreview?: string;
  createdAt: number;
  read: boolean;
}

export interface PostLike {
  uid: string;
  name: string;
  avatarUrl?: string;
  createdAt: number;
}

export type FriendshipStatus = "pending" | "accepted";

export interface Friendship {
  id: string;
  uids: [string, string];
  requestedBy: string;
  status: FriendshipStatus;
  createdAt: number;
  respondedAt?: number;
  profiles: Record<string, { name: string; avatarUrl?: string; handle?: string }>;
}

export interface PublicProfile {
  uid: string;
  name: string;
  nameLower: string;
  handle: string;
  handleLower: string;
  avatarUrl?: string;
  coverUrl?: string;
  profileVisibility: ProfileVisibility;
}

export interface TMDBMovie {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  media_type?: "movie" | "tv";
}

export const MEDIA_TYPES: MediaType[] = ["Filme", "Série"];

export const MEDIA_STATUSES: MediaStatus[] = ["Assistindo", "Quero Ver", "Visto"];

export const DEFAULT_COVER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%2318181b'/%3E%3Cg fill='none' stroke='%233f3f46' stroke-width='2'%3E%3Crect x='30' y='30' width='240' height='390' rx='8'/%3E%3C/g%3E%3Cpath d='M120 190l70 40-70 40z' fill='%233f3f46'/%3E%3Ccircle cx='150' cy='230' r='58' fill='none' stroke='%233f3f46' stroke-width='2'/%3E%3C/svg%3E";
