import { Flame, Loader2, Rss } from "lucide-react";
import type { DetailsTarget } from "./MediaDetailsModal";
import type { Post } from "../types";
import type { MentionCandidate } from "../utils/mentions";
import { PostCard } from "./PostCard";

interface FeedTabProps {
  uid: string;
  posts: Post[];
  feedLoading: boolean;
  trending: {
    tmdbId: number;
    title: string;
    coverUrl: string;
    mediaType: "movie" | "tv";
    count: number;
  }[];
  mentionCandidates: MentionCandidate[];
  onOpenProfile: (uid: string) => void;
  onOpenDetails: (target: DetailsTarget) => void;
}

export function FeedTab({
  uid,
  posts,
  feedLoading,
  trending,
  mentionCandidates,
  onOpenProfile,
  onOpenDetails,
}: FeedTabProps) {
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">Feed</h1>

      {trending.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Flame size={15} className="text-[#a32638]" /> Em Alta Entre Amigos
          </h2>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
            {trending.map((t) => (
              <button
                key={t.tmdbId}
                onClick={() => onOpenDetails({ tmdbId: t.tmdbId, mediaType: t.mediaType })}
                className="w-24 shrink-0 text-left sm:w-28"
              >
                <div className="relative overflow-hidden rounded-lg">
                  <img src={t.coverUrl} alt={t.title} className="aspect-2/3 w-full object-cover" />
                  <span className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {t.count}x
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-stone-300">{t.title}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {feedLoading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
          <Loader2 className="animate-spin" size={16} /> Carregando feed…
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stone-800 py-20 text-center">
          <Rss size={32} className="text-stone-700" />
          <p className="text-sm text-stone-500">Seu feed está vazio.</p>
          <p className="text-xs text-stone-600">
            Adicione amigos na aba Amigos ou marque algo como visto e compartilhe.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUid={uid}
              mentionCandidates={mentionCandidates}
              onOpenProfile={onOpenProfile}
              onOpenDetails={onOpenDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}
