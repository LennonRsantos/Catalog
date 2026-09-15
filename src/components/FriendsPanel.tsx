import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query, startAt } from "firebase/firestore";
import { Check, Loader2, Search, User as UserIcon, UserMinus, UserPlus, X } from "lucide-react";
import { db } from "../services/firebase";
import type { Friendship, PublicProfile } from "../types";

interface FriendsPanelProps {
  uid: string;
  myProfile: { name: string; avatarUrl?: string; handle?: string };
  accepted: Friendship[];
  incoming: Friendship[];
  outgoing: Friendship[];
  otherUid: (f: Friendship) => string;
  friendshipWith: (targetUid: string) => Friendship | undefined;
  onSendRequest: (targetUid: string, targetProfile: { name: string; avatarUrl?: string; handle?: string }) => void;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onRemove: (id: string) => void;
  onOpenProfile: (uid: string) => void;
}

async function searchPublicProfiles(term: string, excludeUid: string): Promise<PublicProfile[]> {
  const trimmed = term.trim();
  if (!trimmed) return [];

  const byHandle = trimmed.startsWith("@");
  // handleLower is stored WITH the "@" (e.g. "@l7nnoca"), so the cursor
  // must keep it too — stripping it here used to make startAt() position
  // past every handle (since "@" sorts before any letter), silently
  // returning nothing for every handle search.
  const lower = trimmed.toLowerCase();
  if (!lower) return [];

  // Findable regardless of profileVisibility — private accounts must still
  // be reachable by search to receive a friend request, same as on other
  // social apps. Privacy only gates content, not discoverability.
  const field = byHandle ? "handleLower" : "nameLower";
  const q = query(collection(db, "publicProfiles"), orderBy(field), startAt(lower), limit(30));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as PublicProfile)
    .filter((p) => p.uid !== excludeUid && (byHandle ? p.handleLower : p.nameLower).startsWith(lower))
    .slice(0, 15);
}

function AvatarCircle({ name, avatarUrl, size = 9 }: { name: string; avatarUrl?: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-800 bg-stone-950"
      style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <UserIcon size={size * 1.7} className="text-stone-600" />
      )}
    </div>
  );
}

export function FriendsPanel({
  uid,
  myProfile,
  accepted,
  incoming,
  outgoing,
  otherUid,
  friendshipWith,
  onSendRequest,
  onAccept,
  onDecline,
  onRemove,
  onOpenProfile,
}: FriendsPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<PublicProfile[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      searchPublicProfiles(trimmed, uid)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(handle);
  }, [searchTerm, uid]);

  return (
    <div className="space-y-6">
      <div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou @TAG…"
            aria-label="Buscar por nome ou TAG"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-stone-800 bg-stone-900 py-2.5 pl-9 pr-3 text-sm text-white placeholder-stone-600 outline-none focus:border-[#a32638]"
          />
        </div>

        {searchTerm.trim().length >= 2 && (
          <div className="mt-2 space-y-1 rounded-lg border border-stone-800 bg-stone-900/60 p-2">
            {searching ? (
              <div className="flex items-center gap-2 px-2 py-2 text-xs text-stone-500">
                <Loader2 className="animate-spin" size={13} /> Buscando…
              </div>
            ) : searchResults.length === 0 ? (
              <p className="px-2 py-2 text-xs text-stone-500">Ninguém encontrado com perfil público.</p>
            ) : (
              searchResults.map((result) => {
                const existing = friendshipWith(result.uid);
                return (
                  <div key={result.uid} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                    <button
                      onClick={() => onOpenProfile(result.uid)}
                      className="flex flex-1 items-center gap-2.5 text-left"
                    >
                      <AvatarCircle name={result.name} avatarUrl={result.avatarUrl} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-white">{result.name}</span>
                        <span className="block truncate text-[11px] text-stone-500">{result.handle}</span>
                      </span>
                    </button>

                    {!existing && (
                      <button
                        onClick={() =>
                          onSendRequest(result.uid, { name: result.name, avatarUrl: result.avatarUrl, handle: result.handle })
                        }
                        className="flex shrink-0 items-center gap-1 rounded-full bg-[#a32638] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#bd3347]"
                      >
                        <UserPlus size={12} /> Adicionar
                      </button>
                    )}
                    {existing?.status === "pending" && (
                      <span className="shrink-0 rounded-full bg-stone-800 px-3 py-1.5 text-[11px] font-medium text-stone-400">
                        Pendente
                      </span>
                    )}
                    {existing?.status === "accepted" && (
                      <span className="shrink-0 rounded-full bg-stone-800 px-3 py-1.5 text-[11px] font-medium text-stone-400">
                        Amigos
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {incoming.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Solicitações Recebidas
          </h3>
          <div className="space-y-1.5">
            {incoming.map((f) => {
              const target = otherUid(f);
              const info = f.profiles[target];
              return (
                <div
                  key={f.id}
                  className="flex items-center gap-2.5 rounded-lg border border-stone-800 bg-stone-900/60 px-3 py-2"
                >
                  <button
                    onClick={() => onOpenProfile(target)}
                    className="flex flex-1 items-center gap-2.5 text-left"
                  >
                    <AvatarCircle name={info?.name ?? "Usuário"} avatarUrl={info?.avatarUrl} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white">{info?.name ?? "Usuário"}</span>
                      {info?.handle && <span className="block truncate text-[11px] text-stone-500">{info.handle}</span>}
                    </span>
                  </button>
                  <button
                    onClick={() => onAccept(f.id)}
                    className="shrink-0 rounded-full bg-[#a32638] p-1.5 text-white transition hover:bg-[#bd3347]"
                    aria-label="Aceitar"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => onDecline(f.id)}
                    className="shrink-0 rounded-full bg-stone-800 p-1.5 text-stone-300 transition hover:bg-stone-700"
                    aria-label="Recusar"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Solicitações Enviadas
          </h3>
          <div className="space-y-1.5">
            {outgoing.map((f) => {
              const target = otherUid(f);
              const info = f.profiles[target];
              return (
                <div
                  key={f.id}
                  className="flex items-center gap-2.5 rounded-lg border border-stone-800 bg-stone-900/60 px-3 py-2"
                >
                  <button
                    onClick={() => onOpenProfile(target)}
                    className="flex flex-1 items-center gap-2.5 text-left"
                  >
                    <AvatarCircle name={info?.name ?? "Usuário"} avatarUrl={info?.avatarUrl} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white">{info?.name ?? "Usuário"}</span>
                      {info?.handle && <span className="block truncate text-[11px] text-stone-500">{info.handle}</span>}
                    </span>
                  </button>
                  <button
                    onClick={() => onDecline(f.id)}
                    className="shrink-0 rounded-full border border-stone-700 px-3 py-1.5 text-[11px] font-medium text-stone-400 transition hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Meus Amigos {accepted.length > 0 && `(${accepted.length})`}
        </h3>
        {accepted.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-800 px-3 py-6 text-center text-xs text-stone-500">
            Você ainda não tem amigos. Use a busca acima pra encontrar pessoas.
          </p>
        ) : (
          <div className="space-y-1.5">
            {accepted.map((f) => {
              const target = otherUid(f);
              const info = f.profiles[target];
              return (
                <div
                  key={f.id}
                  className="flex items-center gap-2.5 rounded-lg border border-stone-800 bg-stone-900/60 px-3 py-2"
                >
                  <button
                    onClick={() => onOpenProfile(target)}
                    className="flex flex-1 items-center gap-2.5 text-left"
                  >
                    <AvatarCircle name={info?.name ?? "Usuário"} avatarUrl={info?.avatarUrl} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white">{info?.name ?? "Usuário"}</span>
                      {info?.handle && <span className="block truncate text-[11px] text-stone-500">{info.handle}</span>}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Remover ${info?.name ?? "este usuário"} da sua lista de amigos?`)) {
                        onRemove(f.id);
                      }
                    }}
                    className="flex shrink-0 items-center gap-1 rounded-full border border-stone-700 px-3 py-1.5 text-[11px] font-medium text-stone-400 transition hover:border-red-900 hover:text-[#d97a86]"
                  >
                    <UserMinus size={12} /> Remover
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-center text-[11px] text-stone-600">
        Sua TAG: <span className="font-medium text-stone-400">{myProfile.handle ?? "…"}</span> — compartilhe
        pra outras pessoas te encontrarem.
      </p>
    </div>
  );
}
