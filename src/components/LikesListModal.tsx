import { useEffect, useState } from "react";
import { Heart, Loader2, User as UserIcon, X } from "lucide-react";
import { supabase } from "../services/supabase";
import { useEscapeClose } from "../hooks/useEscapeClose";
import type { PostLike } from "../types";

interface LikesListModalProps {
  postId: string | null;
  onClose: () => void;
  onOpenProfile: (uid: string) => void;
}

export function LikesListModal({ postId, onClose, onOpenProfile }: LikesListModalProps) {
  const [likes, setLikes] = useState<PostLike[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    let cancelled = false;

    async function refetch() {
      const { data, error } = await supabase
        .from("likes")
        .select("*")
        .eq("post_id", postId as string)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (!error) {
        setLikes((data ?? []).map((row) => ({ uid: row.liker_uid, name: row.name, avatarUrl: row.avatar_url ?? undefined, createdAt: new Date(row.created_at).getTime() })));
      }
      setLoading(false);
    }

    refetch();

    const channel = supabase
      .channel(`likes:${postId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "likes", filter: `post_id=eq.${postId}` }, () => refetch())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
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
        className="max-h-[70vh] w-full max-w-sm overflow-y-auto overscroll-contain rounded-t-2xl border border-stone-800 bg-stone-900 p-6 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Heart size={18} className="fill-[#a32638] text-[#a32638]" /> Curtidas
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-800 hover:text-white"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-xs text-stone-500">
            <Loader2 className="animate-spin" size={14} /> Carregando…
          </div>
        ) : likes.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">Ninguém curtiu ainda.</p>
        ) : (
          <ul className="space-y-1">
            {likes.map((like) => (
              <li key={like.uid}>
                <button
                  onClick={() => {
                    onOpenProfile(like.uid);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-stone-800"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-800 bg-stone-950">
                    {like.avatarUrl ? (
                      <img src={like.avatarUrl} alt={like.name} className="h-full w-full object-cover" />
                    ) : (
                      <UserIcon size={16} className="text-stone-600" />
                    )}
                  </div>
                  <span className="truncate text-sm font-medium text-white">{like.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
