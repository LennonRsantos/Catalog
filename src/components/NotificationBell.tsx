import { useState } from "react";
import { Bell, Check, Heart, MessageCircle, Rss, User as UserIcon, X } from "lucide-react";
import type { AppNotification, Friendship, MediaItem } from "../types";
import { timeAgo } from "../utils/time";
import { useEscapeClose } from "../hooks/useEscapeClose";

interface NotificationBellProps {
  pendingItems: MediaItem[];
  onMarkWatched: (id: string) => void;
  incomingFriendRequests: Friendship[];
  onAcceptFriend: (id: string) => void;
  onDeclineFriend: (id: string) => void;
  notifications: AppNotification[];
  onOpenPost: (postId: string, commentId?: string) => void;
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
}

const NOTIFICATION_ICON = { new_post: Rss, like: Heart, comment: MessageCircle } as const;

function notificationText(n: AppNotification): string {
  if (n.type === "new_post") return `${n.actorName} publicou uma nova recomendação.`;
  if (n.type === "like") return `${n.actorName} curtiu sua publicação.`;
  return `${n.actorName} comentou: "${n.commentPreview}"`;
}

export function NotificationBell({
  pendingItems,
  onMarkWatched,
  incomingFriendRequests,
  onAcceptFriend,
  onDeclineFriend,
  notifications,
  onOpenPost,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  useEscapeClose(() => setOpen(false), open);
  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const count = pendingItems.length + incomingFriendRequests.length + unreadNotifications;

  function handleOpenNotification(n: AppNotification) {
    if (!n.read) onMarkNotificationRead(n.id);
    onOpenPost(n.postId, n.commentId);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full border border-stone-800 bg-stone-900 p-2 text-stone-400 transition hover:border-stone-700 hover:text-white"
        aria-label="Notificações"
      >
        <Bell size={16} />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#a32638] px-1 text-[9px] font-bold text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-stone-800 bg-stone-900 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b border-stone-800 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">Notificações</h3>
              {unreadNotifications > 0 && (
                <button
                  onClick={onMarkAllNotificationsRead}
                  className="text-[11px] font-medium text-[#bd3347] hover:text-[#d97a86]"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {count === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-stone-500">Nenhuma pendência por aqui.</p>
            ) : (
              <ul className="max-h-96 overflow-y-auto overscroll-contain">
                {incomingFriendRequests.map((f) => {
                  const targetUid = f.uids.find((u) => u !== f.requestedBy);
                  const info = targetUid ? f.profiles[f.requestedBy] : undefined;
                  return (
                    <li
                      key={f.id}
                      className="flex items-center gap-3 border-b border-stone-800/60 px-4 py-2.5 last:border-0"
                    >
                      <div className="flex h-9 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-800 bg-stone-950">
                        {info?.avatarUrl ? (
                          <img src={info.avatarUrl} alt={info.name} className="h-full w-full object-cover" />
                        ) : (
                          <UserIcon size={14} className="text-stone-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-white">{info?.name ?? "Usuário"}</p>
                        <p className="truncate text-[11px] text-stone-500">
                          {info?.handle ? `${info.handle} · quer ser seu amigo` : "Quer ser seu amigo"}
                        </p>
                      </div>
                      <button
                        onClick={() => onAcceptFriend(f.id)}
                        className="shrink-0 rounded-full bg-stone-800 p-1.5 text-stone-300 transition hover:bg-[#a32638] hover:text-white"
                        aria-label="Aceitar"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => onDeclineFriend(f.id)}
                        className="shrink-0 rounded-full bg-stone-800 p-1.5 text-stone-300 transition hover:bg-stone-700"
                        aria-label="Recusar"
                      >
                        <X size={13} />
                      </button>
                    </li>
                  );
                })}

                {notifications.map((n) => {
                  const Icon = NOTIFICATION_ICON[n.type];
                  return (
                    <li key={n.id} className={`border-b border-stone-800/60 last:border-0 ${!n.read ? "bg-[#a32638]/6" : ""}`}>
                      <button
                        onClick={() => handleOpenNotification(n)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
                      >
                        <div className="relative flex h-9 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-800 bg-stone-950">
                          {n.actorAvatarUrl ? (
                            <img src={n.actorAvatarUrl} alt={n.actorName} className="h-full w-full object-cover" />
                          ) : (
                            <UserIcon size={14} className="text-stone-600" />
                          )}
                          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-stone-900 text-[#bd3347] ring-1 ring-stone-800">
                            <Icon size={9} />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-stone-200">{notificationText(n)}</p>
                          <p className="text-[11px] text-stone-500">{timeAgo(n.createdAt)}</p>
                        </div>
                        {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-[#a32638]" />}
                      </button>
                    </li>
                  );
                })}

                {pendingItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 border-b border-stone-800/60 px-4 py-2.5 last:border-0">
                    <img src={item.coverUrl} alt="" className="h-10 w-7 shrink-0 rounded object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white">{item.title}</p>
                      <p className="text-[11px] text-stone-500">Terminou. Marcar como visto?</p>
                    </div>
                    <button
                      onClick={() => onMarkWatched(item.id)}
                      className="shrink-0 rounded-full bg-stone-800 p-1.5 text-stone-300 transition hover:bg-[#a32638] hover:text-white"
                      aria-label="Marcar como visto"
                    >
                      <Check size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
