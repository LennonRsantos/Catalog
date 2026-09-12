import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../services/firebase";
import type { AppNotification } from "../types";

function notificationsRef(uid: string) {
  return collection(db, "profiles", uid, "notifications");
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
    const q = query(notificationsRef(uid), orderBy("createdAt", "desc"), limit(limitCount));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsubscribe;
  }, [uid, limitCount]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  async function markRead(id: string) {
    if (!uid) return;
    await updateDoc(doc(notificationsRef(uid), id), { read: true });
  }

  async function markAllRead() {
    if (!uid) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    for (const n of unread) batch.update(doc(notificationsRef(uid), n.id), { read: true });
    await batch.commit();
  }

  async function deleteNotification(id: string) {
    if (!uid) return;
    await deleteDoc(doc(notificationsRef(uid), id));
  }

  return { notifications, loading, unreadCount, markRead, markAllRead, deleteNotification };
}
