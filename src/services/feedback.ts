import { supabase } from "./supabase";

export type FeedbackPriority = "Baixa" | "Média" | "Alta";

export interface SuggestionInput {
  title: string;
  description: string;
  category: string;
  priority?: FeedbackPriority;
}

export interface BugReportInput {
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedBehavior: string;
  actualBehavior: string;
  priority: FeedbackPriority;
  attachment?: File | null;
}

export class FeedbackSubmitError extends Error {}

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const GENERIC_ERROR = "Não foi possível enviar sua mensagem. Tente novamente.";

async function uploadAttachment(uid: string, file: File): Promise<string> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new FeedbackSubmitError("Arquivo muito grande. Máximo de 5MB.");
  }
  const path = `${uid}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage
    .from("feedback-attachments")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new FeedbackSubmitError(GENERIC_ERROR);
  return path;
}

export async function submitSuggestion(uid: string, input: SuggestionInput): Promise<void> {
  const { error } = await supabase.from("feedback_submissions").insert({
    author_uid: uid,
    kind: "suggestion",
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    priority: input.priority ?? null,
  });
  if (error) throw new FeedbackSubmitError(GENERIC_ERROR);
}

export async function submitBugReport(uid: string, input: BugReportInput): Promise<void> {
  const attachmentPath = input.attachment ? await uploadAttachment(uid, input.attachment) : null;

  const { error } = await supabase.from("feedback_submissions").insert({
    author_uid: uid,
    kind: "bug",
    title: input.title.trim(),
    description: input.description.trim(),
    steps_to_reproduce: input.stepsToReproduce.trim(),
    expected_behavior: input.expectedBehavior.trim(),
    actual_behavior: input.actualBehavior.trim(),
    priority: input.priority,
    attachment_path: attachmentPath,
  });
  if (error) throw new FeedbackSubmitError(GENERIC_ERROR);
}
