import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "../services/firebase";
import type { Friendship } from "../types";

function pairId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

interface DenormalizedProfile {
  name: string;
  avatarUrl?: string;
  handle?: string;
}

export function useFriends(uid: string | null) {
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setFriendships([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, "friendships"), where("uids", "array-contains", uid));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setFriendships(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Friendship));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsubscribe;
  }, [uid]);

  const accepted = useMemo(() => friendships.filter((f) => f.status === "accepted"), [friendships]);

  const incoming = useMemo(
    () => (uid ? friendships.filter((f) => f.status === "pending" && f.requestedBy !== uid) : []),
    [friendships, uid]
  );

  const outgoing = useMemo(
    () => (uid ? friendships.filter((f) => f.status === "pending" && f.requestedBy === uid) : []),
    [friendships, uid]
  );

  function otherUid(f: Friendship): string {
    return uid ? f.uids.find((u) => u !== uid) ?? "" : "";
  }

  const friendUids = useMemo(() => accepted.map(otherUid), [accepted, uid]);

  function friendshipWith(targetUid: string): Friendship | undefined {
    return friendships.find((f) => f.uids.includes(targetUid));
  }

  async function sendRequest(
    targetUid: string,
    targetProfile: DenormalizedProfile,
    myProfile: DenormalizedProfile
  ) {
    if (!uid || uid === targetUid) return;
    const [lo, hi] = uid < targetUid ? [uid, targetUid] : [targetUid, uid];
    await setDoc(doc(db, "friendships", pairId(uid, targetUid)), {
      uids: [lo, hi],
      requestedBy: uid,
      status: "pending",
      createdAt: Date.now(),
      profiles: {
        [uid]: { name: myProfile.name, avatarUrl: myProfile.avatarUrl ?? null, handle: myProfile.handle ?? null },
        [targetUid]: {
          name: targetProfile.name,
          avatarUrl: targetProfile.avatarUrl ?? null,
          handle: targetProfile.handle ?? null,
        },
      },
    });
  }

  async function acceptRequest(id: string) {
    await updateDoc(doc(db, "friendships", id), { status: "accepted", respondedAt: Date.now() });
  }

  async function declineRequest(id: string) {
    await deleteDoc(doc(db, "friendships", id));
  }

  async function removeFriend(id: string) {
    await deleteDoc(doc(db, "friendships", id));
  }

  return {
    loading,
    accepted,
    incoming,
    outgoing,
    friendUids,
    otherUid,
    friendshipWith,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
  };
}
