import { useState } from "react";
import { Download, Lightbulb, LogOut, ShieldAlert, ShieldCheck, Sparkles, Upload, User as UserIcon } from "lucide-react";
import type { MediaItem, User } from "../types";
import { useEscapeClose } from "../hooks/useEscapeClose";

interface UserMenuProps {
  profile: User;
  items: MediaItem[];
  onOpenPersonalData: () => void;
  onOpenGenres: () => void;
  onOpenPrivacy: () => void;
  onOpenFeedback: () => void;
  onOpenAdminPanel: () => void;
  onRestore: (items: MediaItem[]) => void;
  onLogout: () => void;
}

export function UserMenu({
  profile,
  items,
  onOpenPersonalData,
  onOpenGenres,
  onOpenPrivacy,
  onOpenFeedback,
  onOpenAdminPanel,
  onRestore,
  onLogout,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  useEscapeClose(() => setOpen(false), open);

  function handleExport() {
    const payload = { profile, items, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meu-catalogo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (Array.isArray(data.items)) {
          onRestore(data.items as MediaItem[]);
        }
      } catch {
        window.alert("Arquivo inválido. Selecione um JSON exportado por este app.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-800 bg-[#a32638] text-xs font-bold text-white transition hover:border-stone-700"
        aria-label="Perfil e configurações"
      >
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
        ) : (
          profile.name.charAt(0).toUpperCase()
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-stone-800 bg-stone-900 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-3 border-b border-stone-800 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-800 bg-stone-950">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  <UserIcon size={16} className="text-stone-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                  {profile.name}
                  {profile.role === "owner" && (
                    <span className="rounded-full bg-[#a32638] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                      Owner
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-stone-500">{profile.email}</p>
              </div>
            </div>

            <div className="py-1">
              <button
                onClick={() => {
                  onOpenPersonalData();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-stone-200 hover:bg-stone-800"
              >
                <UserIcon size={15} className="text-stone-500" /> Dados Pessoais
              </button>

              <button
                onClick={() => {
                  onOpenGenres();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-stone-200 hover:bg-stone-800"
              >
                <Sparkles size={15} className="text-stone-500" /> Gêneros Favoritos
              </button>

              <button
                onClick={() => {
                  onOpenPrivacy();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-stone-200 hover:bg-stone-800"
              >
                <ShieldCheck size={15} className="text-stone-500" /> Privacidade
              </button>

              <button
                onClick={() => {
                  onOpenFeedback();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-stone-200 hover:bg-stone-800"
              >
                <Lightbulb size={15} className="text-stone-500" /> Sugestões e Bugs
              </button>

              <button
                onClick={handleExport}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-stone-200 hover:bg-stone-800"
              >
                <Download size={15} className="text-stone-500" /> Exportar histórico (JSON)
              </button>

              <label className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-sm text-stone-200 hover:bg-stone-800">
                <Upload size={15} className="text-stone-500" /> Restaurar dados
                <input type="file" accept="application/json" onChange={handleRestoreFile} className="hidden" />
              </label>
            </div>

            {profile.role === "owner" && (
              <div className="border-t border-stone-800 py-1">
                <button
                  onClick={() => {
                    onOpenAdminPanel();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-stone-200 hover:bg-stone-800"
                >
                  <ShieldAlert size={15} className="text-stone-500" /> Painel Administrativo
                </button>
              </div>
            )}

            <div className="border-t border-stone-800 py-1">
              <button
                onClick={() => {
                  onLogout();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[#d97a86] hover:bg-stone-800"
              >
                <LogOut size={15} /> Encerrar Sessão
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
