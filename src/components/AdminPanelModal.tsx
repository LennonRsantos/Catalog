import { useEffect, useState } from "react";
import {
  Archive,
  Ban,
  Bug,
  Download,
  Eye,
  Gauge,
  Lightbulb,
  ListChecks,
  Loader2,
  RotateCcw,
  ScrollText,
  Search,
  Send,
  Settings as SettingsIcon,
  ShieldAlert,
  Users as UsersIcon,
  X,
} from "lucide-react";
import type { User } from "../types";
import { useEscapeClose } from "../hooks/useEscapeClose";
import { useAppSettings } from "../hooks/useAppSettings";
import { timeAgo } from "../utils/time";
import { notifyError, notifySaved } from "../utils/toast";
import {
  AdminActionError,
  createManualBackup,
  exportUsersAndFeedback,
  fetchAdminFeedback,
  fetchAdminLogs,
  fetchAdminUsers,
  logAdminAction,
  respondToFeedback,
  setFeedbackStatus,
  setUserStatus,
  updateAppSettings,
  type AdminActionLog,
  type AdminFeedbackRow,
  type AdminUserRow,
  type FeedbackStatus,
} from "../services/admin";

interface AdminPanelModalProps {
  open: boolean;
  onClose: () => void;
  profile: User;
  authUid: string;
  onOpenProfile: (uid: string) => void;
}

type Section = "overview" | "users" | "feedback" | "settings" | "logs";

const SECTIONS: { value: Section; label: string; icon: typeof Gauge }[] = [
  { value: "overview", label: "Visão Geral", icon: Gauge },
  { value: "users", label: "Usuários", icon: UsersIcon },
  { value: "feedback", label: "Sugestões e Bugs", icon: Lightbulb },
  { value: "settings", label: "Configurações", icon: SettingsIcon },
  { value: "logs", label: "Logs", icon: ScrollText },
];

const FEEDBACK_STATUSES: { value: FeedbackStatus; label: string }[] = [
  { value: "novo", label: "Novo" },
  { value: "em_analise", label: "Em análise" },
  { value: "respondido", label: "Respondido" },
  { value: "resolvido", label: "Resolvido" },
  { value: "fechado", label: "Fechado" },
];

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-950 p-3 text-center">
      <p className="text-xl font-extrabold text-white">{value}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-stone-500">{label}</p>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-lg border border-stone-800 bg-stone-950 px-3 py-3 text-left"
    >
      <span className="min-w-0 pr-3">
        <span className="block text-sm font-medium text-white">{label}</span>
        <span className="block text-xs text-stone-500">{description}</span>
      </span>
      <span
        className={`flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition ${
          checked ? "justify-end bg-[#a32638]" : "justify-start bg-stone-700"
        }`}
      >
        <span className="h-5 w-5 rounded-full bg-white" />
      </span>
    </button>
  );
}

export function AdminPanelModal({ open, onClose, profile, authUid, onOpenProfile }: AdminPanelModalProps) {
  const [section, setSection] = useState<Section>("overview");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [feedback, setFeedback] = useState<AdminFeedbackRow[]>([]);
  const [logs, setLogs] = useState<AdminActionLog[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [expandedFeedbackId, setExpandedFeedbackId] = useState<string | null>(null);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const { settings } = useAppSettings();

  const isOwner = profile.role === "owner";

  useEscapeClose(onClose, open);

  useEffect(() => {
    if (!open || !isOwner) return;
    setSection("overview");
    setLoading(true);
    Promise.all([fetchAdminUsers(), fetchAdminFeedback(), fetchAdminLogs()])
      .then(([u, f, l]) => {
        setUsers(u);
        setFeedback(f);
        setLogs(l);
      })
      .catch((err) => {
        console.error("Falha ao carregar painel administrativo:", err);
        notifyError("Não foi possível carregar o painel.");
      })
      .finally(() => setLoading(false));
  }, [open, isOwner]);

  if (!open) return null;

  if (!isOwner) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
        <div
          className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-stone-800 bg-stone-900 p-6 text-center shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <ShieldAlert size={28} className="text-[#a32638]" />
          <p className="text-sm font-medium text-white">Acesso não autorizado.</p>
          <button
            onClick={onClose}
            className="mt-1 rounded-lg bg-stone-800 px-4 py-2 text-xs font-medium text-stone-300 hover:text-white"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const overview = {
    totalUsers: users.length,
    newLast30Days: users.filter((u) => Date.now() - u.createdAt < 30 * 24 * 60 * 60 * 1000).length,
    totalSuggestions: feedback.filter((f) => f.kind === "suggestion").length,
    totalBugs: feedback.filter((f) => f.kind === "bug").length,
    pending: feedback.filter((f) => f.status === "novo" || f.status === "em_analise").length,
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  async function runAction(id: string, fn: () => Promise<void>, successMessage: string) {
    setBusyId(id);
    try {
      await fn();
      notifySaved(successMessage);
    } catch (err) {
      const message = err instanceof AdminActionError ? err.message : "Não foi possível concluir a ação.";
      notifyError(message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSuspend(user: AdminUserRow) {
    if (user.uid === authUid) return;
    if (!window.confirm(`Suspender ${user.name}? A pessoa perde acesso à conta imediatamente.`)) return;
    await runAction(user.uid, async () => {
      await setUserStatus(user.uid, "suspended");
      await logAdminAction(authUid, "suspend_user", user.uid, { name: user.name, email: user.email });
      setUsers((prev) => prev.map((u) => (u.uid === user.uid ? { ...u, status: "suspended" } : u)));
    }, "Usuário suspenso.");
  }

  async function handleReactivate(user: AdminUserRow) {
    await runAction(user.uid, async () => {
      await setUserStatus(user.uid, "active");
      await logAdminAction(authUid, "reactivate_user", user.uid, { name: user.name, email: user.email });
      setUsers((prev) => prev.map((u) => (u.uid === user.uid ? { ...u, status: "active" } : u)));
    }, "Usuário reativado.");
  }

  async function handleFeedbackStatus(row: AdminFeedbackRow, status: FeedbackStatus) {
    await runAction(row.id, async () => {
      await setFeedbackStatus(row.id, status);
      await logAdminAction(authUid, "feedback_status_change", row.authorUid, { feedbackId: row.id, status });
      setFeedback((prev) => prev.map((f) => (f.id === row.id ? { ...f, status } : f)));
    }, "Status atualizado.");
  }

  async function handleRespond(row: AdminFeedbackRow) {
    const text = (responseDrafts[row.id] ?? "").trim();
    if (!text) return;
    await runAction(row.id, async () => {
      await respondToFeedback(row.id, text);
      await logAdminAction(authUid, "feedback_respond", row.authorUid, { feedbackId: row.id });
      setFeedback((prev) =>
        prev.map((f) => (f.id === row.id ? { ...f, adminResponse: text, status: "respondido", respondedAt: Date.now() } : f))
      );
      setResponseDrafts((prev) => ({ ...prev, [row.id]: "" }));
    }, "Resposta enviada.");
  }

  async function handleToggleSetting(key: "signupEnabled" | "maintenanceMode" | "feedbackEnabled") {
    const next = !settings[key];
    if (key === "maintenanceMode" && next) {
      if (!window.confirm("Ativar modo de manutenção? Todos os usuários (exceto você) ficam bloqueados no app.")) return;
    }
    await runAction(key, async () => {
      await updateAppSettings({ [key]: next });
      await logAdminAction(authUid, "settings_change", undefined, { [key]: next });
    }, "Configuração salva.");
  }

  async function handleExport() {
    exportUsersAndFeedback(users, feedback);
    await logAdminAction(authUid, "export_data");
    notifySaved("Exportação gerada.");
  }

  async function handleBackup() {
    if (!window.confirm("Gerar backup manual agora? O download começa imediatamente.")) return;
    await runAction("backup", async () => {
      await createManualBackup(users, feedback);
      await logAdminAction(authUid, "manual_backup");
    }, "Backup gerado.");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-stone-800 bg-stone-900 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-800 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <ShieldAlert size={18} className="text-[#a32638]" /> Painel Administrativo
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-800 hover:text-white"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-stone-800 px-3 py-2 no-scrollbar">
          {SECTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSection(s.value)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                section === s.value ? "bg-[#a32638] text-white" : "text-stone-400 hover:bg-stone-800 hover:text-white"
              }`}
            >
              <s.icon size={13} /> {s.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto overscroll-contain p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500">
              <Loader2 className="animate-spin" size={18} /> Carregando painel…
            </div>
          ) : (
            <>
              {section === "overview" && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  <StatCard label="Total de usuários" value={overview.totalUsers} />
                  <StatCard label="Novos (30 dias)" value={overview.newLast30Days} />
                  <StatCard label="Sugestões recebidas" value={overview.totalSuggestions} />
                  <StatCard label="Bugs reportados" value={overview.totalBugs} />
                  <StatCard label="Pendentes" value={overview.pending} />
                </div>
              )}

              {section === "users" && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                    <input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Buscar por nome ou e-mail…"
                      className="w-full rounded-lg border border-stone-800 bg-stone-950 py-2 pl-9 pr-3 text-sm text-white placeholder-stone-600 outline-none focus:border-[#a32638]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    {filteredUsers.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-stone-800 px-3 py-6 text-center text-xs text-stone-500">
                        Nenhum usuário encontrado.
                      </p>
                    ) : (
                      filteredUsers.map((u) => (
                        <div
                          key={u.uid}
                          className="flex flex-wrap items-center gap-2.5 rounded-lg border border-stone-800 bg-stone-950 px-3 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-1.5 truncate text-sm font-medium text-white">
                              {u.name}
                              {u.role === "owner" && (
                                <span className="rounded-full bg-[#a32638] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                                  Owner
                                </span>
                              )}
                              {u.status === "suspended" && (
                                <span className="rounded-full bg-stone-800 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#d97a86]">
                                  Suspenso
                                </span>
                              )}
                            </p>
                            <p className="truncate text-xs text-stone-500">
                              {u.email} · {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              onClick={() => onOpenProfile(u.uid)}
                              className="flex items-center gap-1 rounded-full border border-stone-700 px-2.5 py-1.5 text-[11px] font-medium text-stone-400 transition hover:text-white"
                            >
                              <Eye size={12} /> Ver
                            </button>
                            {u.uid !== authUid &&
                              (u.status === "active" ? (
                                <button
                                  onClick={() => handleSuspend(u)}
                                  disabled={busyId === u.uid}
                                  className="flex items-center gap-1 rounded-full border border-stone-700 px-2.5 py-1.5 text-[11px] font-medium text-stone-400 transition hover:border-red-900 hover:text-[#d97a86] disabled:opacity-50"
                                >
                                  <Ban size={12} /> Suspender
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReactivate(u)}
                                  disabled={busyId === u.uid}
                                  className="flex items-center gap-1 rounded-full bg-[#a32638] px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#bd3347] disabled:opacity-50"
                                >
                                  <RotateCcw size={12} /> Reativar
                                </button>
                              ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {section === "feedback" && (
                <div className="space-y-1.5">
                  {feedback.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-stone-800 px-3 py-6 text-center text-xs text-stone-500">
                      Nenhuma sugestão ou bug recebido ainda.
                    </p>
                  ) : (
                    feedback.map((f) => {
                      const expanded = expandedFeedbackId === f.id;
                      return (
                        <div key={f.id} className="rounded-lg border border-stone-800 bg-stone-950 px-3 py-2.5">
                          <button
                            onClick={() => setExpandedFeedbackId(expanded ? null : f.id)}
                            className="flex w-full items-start gap-2.5 text-left"
                          >
                            {f.kind === "bug" ? (
                              <Bug size={15} className="mt-0.5 shrink-0 text-[#d97a86]" />
                            ) : (
                              <Lightbulb size={15} className="mt-0.5 shrink-0 text-[#d9a441]" />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-white">{f.title}</span>
                              <span className="block truncate text-[11px] text-stone-500">
                                {f.authorName} · {f.authorEmail} · {timeAgo(f.createdAt)}
                                {f.priority ? ` · ${f.priority}` : ""}
                              </span>
                            </span>
                            <span className="shrink-0 rounded-full bg-stone-800 px-2 py-1 text-[10px] font-medium uppercase text-stone-300">
                              {FEEDBACK_STATUSES.find((s) => s.value === f.status)?.label ?? f.status}
                            </span>
                          </button>

                          {expanded && (
                            <div className="mt-3 space-y-3 border-t border-stone-800 pt-3">
                              <p className="text-xs text-stone-300">{f.description}</p>
                              {f.kind === "bug" && (
                                <div className="space-y-1.5 text-xs text-stone-400">
                                  {f.stepsToReproduce && (
                                    <p>
                                      <span className="text-stone-500">Passos: </span>
                                      {f.stepsToReproduce}
                                    </p>
                                  )}
                                  {f.expectedBehavior && (
                                    <p>
                                      <span className="text-stone-500">Esperado: </span>
                                      {f.expectedBehavior}
                                    </p>
                                  )}
                                  {f.actualBehavior && (
                                    <p>
                                      <span className="text-stone-500">Atual: </span>
                                      {f.actualBehavior}
                                    </p>
                                  )}
                                </div>
                              )}

                              <div className="flex flex-wrap gap-1.5">
                                {FEEDBACK_STATUSES.map((s) => (
                                  <button
                                    key={s.value}
                                    onClick={() => handleFeedbackStatus(f, s.value)}
                                    disabled={busyId === f.id}
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-50 ${
                                      f.status === s.value
                                        ? "bg-[#a32638] text-white"
                                        : "bg-stone-800 text-stone-400 hover:text-white"
                                    }`}
                                  >
                                    {s.label}
                                  </button>
                                ))}
                              </div>

                              {f.adminResponse && (
                                <div className="rounded-lg bg-stone-900 px-3 py-2 text-xs text-stone-300">
                                  <span className="mb-1 block text-[10px] uppercase tracking-wide text-stone-500">
                                    Sua resposta
                                  </span>
                                  {f.adminResponse}
                                </div>
                              )}

                              <div className="flex items-center gap-2">
                                <input
                                  value={responseDrafts[f.id] ?? ""}
                                  onChange={(e) => setResponseDrafts((prev) => ({ ...prev, [f.id]: e.target.value }))}
                                  placeholder="Responder ao usuário…"
                                  className="flex-1 rounded-lg bg-stone-900 px-3 py-2 text-xs text-white placeholder-stone-600 outline-none focus:ring-2 focus:ring-[#a32638]"
                                />
                                <button
                                  onClick={() => handleRespond(f)}
                                  disabled={busyId === f.id || !(responseDrafts[f.id] ?? "").trim()}
                                  className="flex shrink-0 items-center gap-1 rounded-lg bg-[#a32638] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-[#bd3347] disabled:opacity-50"
                                >
                                  <Send size={12} /> Enviar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {section === "settings" && (
                <div className="space-y-3">
                  <ToggleRow
                    label="Permitir novos cadastros"
                    description={
                      settings.signupEnabled
                        ? "Novos usuários podem se cadastrar."
                        : "Cadastro bloqueado no app (bloqueio real ainda requer desativar em Supabase Auth também)."
                    }
                    checked={settings.signupEnabled}
                    onToggle={() => handleToggleSetting("signupEnabled")}
                  />
                  <ToggleRow
                    label="Modo de manutenção"
                    description={
                      settings.maintenanceMode
                        ? "App bloqueado pra todo mundo, exceto você."
                        : "App funcionando normalmente pra todos."
                    }
                    checked={settings.maintenanceMode}
                    onToggle={() => handleToggleSetting("maintenanceMode")}
                  />
                  <ToggleRow
                    label="Envio de sugestões e bugs"
                    description={
                      settings.feedbackEnabled
                        ? "Usuários podem enviar sugestões e reportes."
                        : "Envio bloqueado (inclusive no backend)."
                    }
                    checked={settings.feedbackEnabled}
                    onToggle={() => handleToggleSetting("feedbackEnabled")}
                  />

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={handleExport}
                      className="flex items-center justify-center gap-2 rounded-lg border border-stone-800 bg-stone-950 py-3 text-xs font-medium text-stone-300 transition hover:text-white"
                    >
                      <Download size={14} /> Exportar dados
                    </button>
                    <button
                      onClick={handleBackup}
                      disabled={busyId === "backup"}
                      className="flex items-center justify-center gap-2 rounded-lg border border-stone-800 bg-stone-950 py-3 text-xs font-medium text-stone-300 transition hover:text-white disabled:opacity-50"
                    >
                      {busyId === "backup" ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                      Criar backup manual
                    </button>
                  </div>
                </div>
              )}

              {section === "logs" && (
                <div className="space-y-1.5">
                  {logs.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-stone-800 px-3 py-6 text-center text-xs text-stone-500">
                      Nenhuma ação administrativa registrada ainda.
                    </p>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="flex items-center gap-2.5 rounded-lg border border-stone-800 bg-stone-950 px-3 py-2">
                        <ListChecks size={13} className="shrink-0 text-stone-500" />
                        <span className="min-w-0 flex-1 truncate text-xs text-stone-300">{log.action}</span>
                        <span className="shrink-0 text-[11px] text-stone-500">{timeAgo(log.createdAt)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
