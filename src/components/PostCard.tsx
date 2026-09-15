import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import type { Tables } from "../services/database.types";
import {
  Check,
  Clapperboard,
  Heart,
  MessageCircle,
  MoreVertical,
  Pencil,
  Send,
  Trash2,
  Tv,
  User as UserIcon,
  X,
} from "lucide-react";
import type { DetailsTarget } from "./MediaDetailsModal";
import type { Post, PostComment, PostVisibility } from "../types";
import { StarRating } from "./StarRating";
import { LikesListModal } from "./LikesListModal";
import { MentionField } from "./MentionField";
import { MentionText } from "./MentionText";
import {
  addComment,
  deleteComment,
  deletePost,
  toggleLike,
  updateComment,
  updatePostContent,
} from "../hooks/useFeed";
import { timeAgo } from "../utils/time";
import { useEscapeClose } from "../hooks/useEscapeClose";
import { extractMentions, formatWatchedWithLabel, type MentionCandidate } from "../utils/mentions";

const VISIBILITY_OPTIONS: { value: PostVisibility; label: string }[] = [
  { value: "public", label: "Público" },
  { value: "friends", label: "Amigos" },
  { value: "private", label: "Só eu" },
];

function rowToComment(row: Tables<"comments">): PostComment {
  return {
    id: row.id,
    authorUid: row.author_uid,
    authorName: row.author_name,
    authorAvatarUrl: row.author_avatar_url ?? undefined,
    text: row.text,
    createdAt: new Date(row.created_at).getTime(),
    editedAt: row.edited_at ? new Date(row.edited_at).getTime() : undefined,
    mentions: (row.mentions as unknown as PostComment["mentions"]) ?? [],
    mentionsAll: row.mentions_all,
  };
}

interface PostCardProps {
  post: Post;
  currentUid: string;
  mentionCandidates: MentionCandidate[];
  onOpenProfile: (uid: string) => void;
  onOpenDetails: (target: DetailsTarget) => void;
  initiallyOpenComments?: boolean;
  highlightCommentId?: string;
}

export function PostCard({
  post,
  currentUid,
  mentionCandidates,
  onOpenProfile,
  onOpenDetails,
  initiallyOpenComments = false,
  highlightCommentId,
}: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(initiallyOpenComments);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [likesModalOpen, setLikesModalOpen] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [editRating, setEditRating] = useState(post.rating);
  const [editReview, setEditReview] = useState(post.review);
  const [editVisibility, setEditVisibility] = useState<PostVisibility>(post.visibility);
  const isAuthor = post.authorUid === currentUid;
  const watchedWith = formatWatchedWithLabel(post.mentions ?? [], post.mentionsAll ?? false);

  useEscapeClose(() => setMenuOpen(false), menuOpen);

  useEffect(() => {
    let cancelled = false;

    async function refetchLiked() {
      const { data } = await supabase
        .from("likes")
        .select("post_id")
        .eq("post_id", post.id)
        .eq("liker_uid", currentUid)
        .maybeSingle();
      if (!cancelled) setLiked(Boolean(data));
    }

    refetchLiked();

    const channel = supabase
      .channel(`likes:${post.id}:${currentUid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "likes", filter: `post_id=eq.${post.id}` }, () => refetchLiked())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [post.id, currentUid]);

  useEffect(() => {
    if (!commentsOpen) return;
    let cancelled = false;

    async function refetchComments() {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (!error) setComments((data ?? []).map(rowToComment));
    }

    refetchComments();

    const channel = supabase
      .channel(`comments:${post.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${post.id}` }, () => refetchComments())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [commentsOpen, post.id]);

  function handleLikeToggle() {
    // Server (toggle_like RPC) decides current state itself — no need to
    // pass currentUserInfo/liked from the client anymore.
    toggleLike(post.id).catch((err) => console.error("Falha ao curtir:", err));
  }

  function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    const { mentions, mentionsAll } = extractMentions(text, mentionCandidates);
    setCommentText("");
    addComment(post.id, { text, mentions, mentionsAll }).catch((err) => console.error("Falha ao comentar:", err));
  }

  function startEditComment(comment: PostComment) {
    setEditingCommentId(comment.id);
    setEditText(comment.text);
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setEditText("");
  }

  function saveEditComment(commentId: string) {
    const text = editText.trim();
    if (!text) return;
    const { mentions, mentionsAll } = extractMentions(text, mentionCandidates);
    updateComment(post.id, commentId, text, mentions, mentionsAll).catch((err) =>
      console.error("Falha ao editar comentário:", err)
    );
    setEditingCommentId(null);
    setEditText("");
  }

  function handleDeleteComment(commentId: string) {
    if (!window.confirm("Apagar este comentário?")) return;
    deleteComment(post.id, commentId).catch((err) => console.error("Falha ao apagar comentário:", err));
  }

  function startEditPost() {
    setEditRating(post.rating);
    setEditReview(post.review);
    setEditVisibility(post.visibility);
    setEditingPost(true);
    setMenuOpen(false);
  }

  function cancelEditPost() {
    setEditingPost(false);
  }

  function saveEditPost() {
    const review = editReview.trim();
    const { mentions, mentionsAll } = extractMentions(review, mentionCandidates);
    updatePostContent(post.id, {
      rating: editRating,
      review,
      visibility: editVisibility,
      mentions,
      mentionsAll,
    }).catch((err) => console.error("Falha ao editar publicação:", err));
    setEditingPost(false);
  }

  function handleDeletePost() {
    setMenuOpen(false);
    if (!window.confirm("Apagar esta publicação do feed? Essa ação não pode ser desfeita.")) return;
    deletePost(post.id).catch((err) => console.error("Falha ao apagar publicação:", err));
  }

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => onOpenProfile(post.authorUid)}
          className="flex items-center gap-2.5 text-left"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-800 bg-stone-950">
            {post.authorAvatarUrl ? (
              <img src={post.authorAvatarUrl} alt={post.authorName} className="h-full w-full object-cover" />
            ) : (
              <UserIcon size={16} className="text-stone-600" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-white hover:underline">
              {post.authorName}
              <span className="font-normal text-stone-400">
                {" "}
                · assistiu{watchedWith ? ` com ${watchedWith}` : ""}
              </span>
            </p>
            <p className="text-[11px] text-stone-500">{timeAgo(post.createdAt)}</p>
          </div>
        </button>

        {isAuthor && !editingPost && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-full p-1.5 text-stone-500 transition hover:bg-stone-800 hover:text-white"
              aria-label="Opções da publicação"
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-stone-800 bg-stone-900 shadow-xl">
                  <button
                    onClick={startEditPost}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-200 hover:bg-stone-800"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                  <button
                    onClick={handleDeletePost}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#bd3347] hover:bg-stone-800"
                  >
                    <Trash2 size={12} /> Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() =>
          post.tmdbId && onOpenDetails({ tmdbId: post.tmdbId, mediaType: post.mediaType })
        }
        disabled={!post.tmdbId}
        className={`flex w-full gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a32638] ${post.tmdbId ? "cursor-pointer" : ""}`}
      >
        <img src={post.coverUrl} alt={post.title} loading="lazy" className="h-24 w-16 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
          <span className="flex w-fit items-center gap-1 rounded-full bg-stone-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-300">
            {post.type === "Filme" ? <Clapperboard size={10} /> : <Tv size={10} />}
            {post.type}
          </span>
          <p className="truncate text-sm font-semibold text-white">{post.title}</p>
          {!editingPost && <StarRating value={post.rating} size={13} />}
        </div>
      </button>

      {editingPost ? (
        <div className="mt-3 space-y-3 border-t border-stone-800 pt-3">
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-500">
              Nota
            </label>
            <StarRating value={editRating} onChange={setEditRating} size={20} />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-500">
              Comentário
            </label>
            <MentionField
              value={editReview}
              onChange={setEditReview}
              candidates={mentionCandidates}
              multiline
              rows={3}
              placeholder="O que você achou? (opcional) — use @ pra mencionar"
              className="w-full resize-none rounded-lg border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-white placeholder-stone-600 outline-none focus:border-[#a32638]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-500">
              Quem pode ver
            </label>
            <div className="flex overflow-hidden rounded-lg border border-stone-800">
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEditVisibility(opt.value)}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium transition ${
                    editVisibility === opt.value
                      ? "bg-[#a32638] text-white"
                      : "bg-stone-950 text-stone-400 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={saveEditPost}
              className="flex items-center gap-1.5 rounded-lg bg-[#a32638] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#bd3347]"
            >
              <Check size={13} /> Salvar
            </button>
            <button
              onClick={cancelEditPost}
              className="flex items-center gap-1.5 rounded-lg border border-stone-700 px-3 py-1.5 text-xs font-medium text-stone-300 transition hover:text-white"
            >
              <X size={13} /> Cancelar
            </button>
          </div>
        </div>
      ) : (
        post.review.trim() && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-stone-300">
            <MentionText
              text={post.review}
              mentions={post.mentions}
              mentionsAll={post.mentionsAll}
              onOpenProfile={onOpenProfile}
            />
          </p>
        )
      )}

      <div className="mt-3 flex items-center gap-4 border-t border-stone-800 pt-3 text-xs text-stone-400">
        <button
          onClick={handleLikeToggle}
          className={`flex items-center gap-1.5 transition ${liked ? "text-[#bd3347]" : "hover:text-white"}`}
        >
          <Heart size={15} className={liked ? "fill-[#bd3347]" : ""} />
          {post.likeCount > 0 ? post.likeCount : "Curtir"}
        </button>

        <button
          onClick={() => setCommentsOpen((v) => !v)}
          className="flex items-center gap-1.5 transition hover:text-white"
        >
          <MessageCircle size={15} />
          {post.commentCount > 0 ? post.commentCount : "Comentar"}
        </button>

        {post.likeCount > 0 && (
          <button onClick={() => setLikesModalOpen(true)} className="ml-auto hover:text-white hover:underline">
            Ver quem curtiu
          </button>
        )}
      </div>

      {commentsOpen && (
        <div className="mt-3 space-y-2.5 border-t border-stone-800 pt-3">
          {comments.map((c) => {
            const isMine = c.authorUid === currentUid;
            const isEditing = editingCommentId === c.id;
            const isHighlighted = c.id === highlightCommentId;
            return (
              <div
                key={c.id}
                className={`flex w-full items-start gap-2 rounded-lg p-1 transition-colors ${
                  isHighlighted ? "bg-[#a32638]/10 ring-1 ring-[#a32638]/40" : ""
                }`}
              >
                <button onClick={() => onOpenProfile(c.authorUid)} className="shrink-0">
                  <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-stone-800 bg-stone-950">
                    {c.authorAvatarUrl ? (
                      <img src={c.authorAvatarUrl} alt={c.authorName} className="h-full w-full object-cover" />
                    ) : (
                      <UserIcon size={12} className="text-stone-600" />
                    )}
                  </div>
                </button>

                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <MentionField
                        value={editText}
                        onChange={setEditText}
                        candidates={mentionCandidates}
                        autoFocus
                        className="w-full rounded-lg border border-stone-800 bg-stone-950 px-2 py-1 text-xs text-white outline-none focus:border-[#a32638]"
                      />
                      <button
                        onClick={() => saveEditComment(c.id)}
                        className="shrink-0 text-green-500 hover:text-green-400"
                        aria-label="Salvar"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={cancelEditComment}
                        className="shrink-0 text-stone-500 hover:text-white"
                        aria-label="Cancelar"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs">
                      <button
                        onClick={() => onOpenProfile(c.authorUid)}
                        className="font-semibold text-white hover:underline"
                      >
                        {c.authorName}
                      </button>{" "}
                      <span className="text-stone-300">
                        <MentionText
                          text={c.text}
                          mentions={c.mentions}
                          mentionsAll={c.mentionsAll}
                          onOpenProfile={onOpenProfile}
                        />
                      </span>
                      {c.editedAt && <span className="text-stone-600"> (editado)</span>}
                    </p>
                  )}
                </div>

                {isMine && !isEditing && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => startEditComment(c)}
                      className="text-stone-500 hover:text-white"
                      aria-label="Editar comentário"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="text-stone-500 hover:text-[#d97a86]"
                      aria-label="Apagar comentário"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <form onSubmit={handleSubmitComment} className="flex items-center gap-2 pt-1">
            <MentionField
              value={commentText}
              onChange={setCommentText}
              candidates={mentionCandidates}
              placeholder="Escreva um comentário… (@ pra mencionar)"
              className="w-full rounded-lg border border-stone-800 bg-stone-950 px-3 py-1.5 text-xs text-white placeholder-stone-600 outline-none focus:border-[#a32638]"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="rounded-lg bg-[#a32638] p-1.5 text-white transition hover:bg-[#bd3347] disabled:opacity-40"
              aria-label="Enviar comentário"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      <LikesListModal
        postId={likesModalOpen ? post.id : null}
        onClose={() => setLikesModalOpen(false)}
        onOpenProfile={onOpenProfile}
      />
    </div>
  );
}
