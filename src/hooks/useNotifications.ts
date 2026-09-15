import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import type { AppNotification, NotificationType } from "../types";
import type { Tables } from "../services/database.types";

type NotificationRow = Tables<"notifications">;

function rowToNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type as NotificationType,
    actorUid: row.actor_uid,
    actorName: row.actor_name,
    actorAvatarUrl: row.actor_avatar_url ?? undefined,
    postId: row.post_id,
    postTitle: row.post_title,
    postCoverUrl: row.post_cover_url,
    commentId: row.comment_id ?? undefined,
    commentPreview: row.comment_preview ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    read: row.read,
  };
}

export function useNotifications(uid: string | null, limitCount = 50) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;

    async function refetch() {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_uid", uid as string)
        .order("created_at", { ascending: false })
        .limit(limitCount);
      if (cancelled) return;
      if (error) {
        console.error("Falha ao carregar notificações:", error);
      } else {
        setNotifications((data ?? []).map(rowToNotification));
      }
      setLoading(false);
    }

    refetch();

    const channel = supabase
      .channel(`notifications:${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_uid=eq.${uid}` },
        () => refetch()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [uid, limitCount]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  async function markRead(id: string) {
    if (!uid) return;
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id).eq("recipient_uid", uid);
    if (error) throw error;
  }

  async function markAllRead() {
    if (!uid) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .in(
        "id",
        unread.map((n) => n.id)
      )
      .eq("recipient_uid", uid);
    if (error) throw error;
  }

  async function deleteNotification(id: string) {
    if (!uid) return;
    const { error } = await supabase.from("notifications").delete().eq("id", id).eq("recipient_uid", uid);
    if (error) throw error;
  }

  return { notifications, loading, unreadCount, markRead, markAllRead, deleteNotification };
}
