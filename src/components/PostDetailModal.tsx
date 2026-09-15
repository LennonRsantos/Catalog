import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { supabase } from "../services/supabase";
import { rowToPost } from "../hooks/useFeed";
import type { DetailsTarget } from "./MediaDetailsModal";
import type { Post } from "../types";
import type { MentionCandidate } from "../utils/mentions";
import { PostCard } from "./PostCard";
import { useEscapeClose } from "../hooks/useEscapeClose";

interface PostDetailModalProps {
  postId: string | null;
  highlightCommentId?: string;
  currentUid: string;
  mentionCandidates: MentionCandidate[];
  onClose: () => void;
  onOpenProfile: (uid: string) => void;
  onOpenDetails: (target: DetailsTarget) => void;
}

export function PostDetailModal({
  postId,
  highlightCommentId,
  currentUid,
  mentionCandidates,
  onClose,
  onOpenProfile,
  onOpenDetails,
}: PostDetailModalProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    async function load() {
      try {
        const { data } = await supabase.from("posts").select("*").eq("id", postId as string).maybeSingle();
        if (cancelled) return;
        if (data) setPost(rowToPost(data));
        else setNotFound(true);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  useEscapeClose(onClose, Boolean(postId));
  if (!postId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-stone-800 bg-stone-900 p-4 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-end">
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
        ) : notFound || !post ? (
          <p className="py-10 text-center text-sm text-stone-500">
            Essa publicação não existe mais.
          </p>
        ) : (
          <PostCard
            post={post}
            currentUid={currentUid}
            mentionCandidates={mentionCandidates}
            onOpenProfile={onOpenProfile}
            onOpenDetails={onOpenDetails}
            initiallyOpenComments
            highlightCommentId={highlightCommentId}
          />
        )}
      </div>
    </div>
  );
}
