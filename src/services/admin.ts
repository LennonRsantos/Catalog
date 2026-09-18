import { supabase } from "./supabase";
import type { ProfileStatus, UserRole } from "../types";
import type { Json } from "./database.types";

export interface AdminUserRow {
  uid: string;
  name: string;
  email: string;
  createdAt: number;
  role: UserRole;
  status: ProfileStatus;
}

export type FeedbackKind = "suggestion" | "bug";
export type FeedbackStatus = "novo" | "em_analise" | "respondido" | "resolvido" | "fechado";

export interface AdminFeedbackRow {
  id: string;
  kind: FeedbackKind;
  title: string;
  description: string;
  category: string | null;
  priority: string | null;
  status: FeedbackStatus;
  authorUid: string;
  authorName: string;
  authorEmail: string;
  createdAt: number;
  stepsToReproduce: string | null;
  expectedBehavior: string | null;
  actualBehavior: string | null;
  attachmentPath: string | null;
  adminResponse: string | null;
  respondedAt: number | null;
}

export interface AdminActionLog {
  id: string;
  actorUid: string;
  action: string;
  targetUid: string | null;
  details: Record<string, unknown> | null;
  createdAt: number;
}

export class AdminActionError extends Error {}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, created_at, role, status")
    .order("created_at", { ascending: false });
  if (error) throw new AdminActionError("Não foi possível carregar os usuários.");
  return (data ?? []).map((r) => ({
    uid: r.id,
    name: r.name,
    email: r.email,
    createdAt: new Date(r.created_at).getTime(),
    role: r.role as UserRole,
    status: r.status as ProfileStatus,
  }));
}

export async function fetchAdminFeedback(): Promise<AdminFeedbackRow[]> {
  const [{ data: feedback, error: feedbackErr }, { data: profiles, error: profilesErr }] = await Promise.all([
    supabase.from("feedback_submissions").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, name, email"),
  ]);
  if (feedbackErr) throw new AdminActionError("Não foi possível carregar sugestões e bugs.");
  if (profilesErr) throw new AdminActionError("Não foi possível carregar sugestões e bugs.");

  const byUid = new Map((profiles ?? []).map((p) => [p.id, p]));
  return (feedback ?? []).map((f) => {
    const author = byUid.get(f.author_uid);
    return {
      id: f.id,
      kind: f.kind as FeedbackKind,
      title: f.title,
      description: f.description,
      category: f.category,
      priority: f.priority,
      status: f.status as FeedbackStatus,
      authorUid: f.author_uid,
      authorName: author?.name ?? "Usuário removido",
      authorEmail: author?.email ?? "",
      createdAt: new Date(f.created_at).getTime(),
      stepsToReproduce: f.steps_to_reproduce,
      expectedBehavior: f.expected_behavior,
      actualBehavior: f.actual_behavior,
      attachmentPath: f.attachment_path,
      adminResponse: f.admin_response,
      respondedAt: f.responded_at ? new Date(f.responded_at).getTime() : null,
    };
  });
}

export async function fetchAdminLogs(): Promise<AdminActionLog[]> {
  const { data, error } = await supabase
    .from("admin_action_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new AdminActionError("Não foi possível carregar os logs.");
  return (data ?? []).map((r) => ({
    id: r.id,
    actorUid: r.actor_uid,
    action: r.action,
    targetUid: r.target_uid,
    details: r.details as Record<string, unknown> | null,
    createdAt: new Date(r.created_at).getTime(),
  }));
}

export async function logAdminAction(
  actorUid: string,
  action: string,
  targetUid?: string,
  details?: Record<string, unknown>
): Promise<void> {
  // Best-effort: a failed log write should never block the action it's
  // recording (same "never let a side-channel write break the main flow"
  // principle the rest of this app follows for notifications/avatars).
  const { error } = await supabase.from("admin_action_logs").insert({
    actor_uid: actorUid,
    action,
    target_uid: targetUid ?? null,
    details: (details ?? null) as Json,
  });
  if (error) console.error("Falha ao registrar log administrativo:", error);
}

export async function setUserStatus(uid: string, status: ProfileStatus): Promise<void> {
  const { error } = await supabase.from("profiles").update({ status }).eq("id", uid);
  if (error) throw new AdminActionError("Não foi possível atualizar o usuário.");
}

export async function setFeedbackStatus(id: string, status: FeedbackStatus): Promise<void> {
  const { error } = await supabase.from("feedback_submissions").update({ status }).eq("id", id);
  if (error) throw new AdminActionError("Não foi possível atualizar o status.");
}

export async function respondToFeedback(id: string, response: string): Promise<void> {
  const { error } = await supabase
    .from("feedback_submissions")
    .update({ admin_response: response.trim(), responded_at: new Date().toISOString(), status: "respondido" })
    .eq("id", id);
  if (error) throw new AdminActionError("Não foi possível enviar a resposta.");
}

export async function updateAppSettings(patch: {
  signupEnabled?: boolean;
  maintenanceMode?: boolean;
  feedbackEnabled?: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from("app_settings")
    .update({
      updated_at: new Date().toISOString(),
      signup_enabled: patch.signupEnabled,
      maintenance_mode: patch.maintenanceMode,
      feedback_enabled: patch.feedbackEnabled,
    })
    .eq("id", true);
  if (error) throw new AdminActionError("Não foi possível salvar a configuração.");
}

function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportUsersAndFeedback(users: AdminUserRow[], feedback: AdminFeedbackRow[]): void {
  downloadJson(`export-usuarios-feedback-${new Date().toISOString().slice(0, 10)}.json`, {
    exportedAt: new Date().toISOString(),
    users,
    feedback,
  });
}

export async function createManualBackup(users: AdminUserRow[], feedback: AdminFeedbackRow[]): Promise<void> {
  const { data: catalogItems, error } = await supabase.from("catalog_items").select("*");
  if (error) throw new AdminActionError("Não foi possível gerar o backup.");
  downloadJson(`backup-catalog-${new Date().toISOString().slice(0, 10)}.json`, {
    createdAt: new Date().toISOString(),
    users,
    feedback,
    catalogItems: catalogItems ?? [],
  });
}
