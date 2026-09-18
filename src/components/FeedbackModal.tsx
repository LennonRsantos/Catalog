import { useEffect, useState } from "react";
import { AlertCircle, Bug, CheckCircle2, Lightbulb, Loader2, Paperclip, X } from "lucide-react";
import { useEscapeClose } from "../hooks/useEscapeClose";
import {
  FeedbackSubmitError,
  submitBugReport,
  submitSuggestion,
  type FeedbackPriority,
} from "../services/feedback";
import { notifyError, notifySaved } from "../utils/toast";
import { useAppSettings } from "../hooks/useAppSettings";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  uid: string;
}

type Tab = "suggestion" | "bug";

const PRIORITIES: FeedbackPriority[] = ["Baixa", "Média", "Alta"];
const CATEGORIES = ["Funcionalidade nova", "Melhoria de UX", "Desempenho", "Outro"];

const inputClass =
  "w-full rounded-lg bg-stone-950 px-3 py-2.5 text-sm text-white placeholder-stone-600 outline-none focus:ring-2 focus:ring-[#a32638]";
const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-400";

function emptySuggestion() {
  return { title: "", description: "", category: "", priority: undefined as FeedbackPriority | undefined };
}

function emptyBug() {
  return {
    title: "",
    description: "",
    stepsToReproduce: "",
    expectedBehavior: "",
    actualBehavior: "",
    priority: "Média" as FeedbackPriority,
    attachment: null as File | null,
  };
}

export function FeedbackModal({ open, onClose, uid }: FeedbackModalProps) {
  const { settings } = useAppSettings();
  const [tab, setTab] = useState<Tab>("suggestion");
  const [suggestion, setSuggestion] = useState(emptySuggestion());
  const [bug, setBug] = useState(emptyBug());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setTab("suggestion");
      setSuggestion(emptySuggestion());
      setBug(emptyBug());
      setSubmitting(false);
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  useEscapeClose(onClose, open);
  if (!open) return null;

  const suggestionValid = suggestion.title.trim() && suggestion.description.trim() && suggestion.category;
  const bugValid =
    bug.title.trim() &&
    bug.description.trim() &&
    bug.stepsToReproduce.trim() &&
    bug.expectedBehavior.trim() &&
    bug.actualBehavior.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tab === "suggestion" && !suggestionValid) return;
    if (tab === "bug" && !bugValid) return;

    setSubmitting(true);
    setError(null);
    try {
      if (tab === "suggestion") {
        await submitSuggestion(uid, {
          title: suggestion.title,
          description: suggestion.description,
          category: suggestion.category,
          priority: suggestion.priority,
        });
      } else {
        await submitBugReport(uid, bug);
      }
      setSuccess(true);
      notifySaved("Feedback enviado!");
    } catch (err) {
      const message = err instanceof FeedbackSubmitError ? err.message : "Não foi possível enviar sua mensagem. Tente novamente.";
      setError(message);
      notifyError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function switchTab(next: Tab) {
    setTab(next);
    setError(null);
    setSuccess(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-stone-800 bg-stone-900 p-6 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Lightbulb size={18} className="text-[#a32638]" /> Ajude a melhorar o sistema
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-800 hover:text-white"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        <p className="mb-5 text-xs text-stone-500">Envie uma sugestão ou reporte um problema encontrado.</p>

        <div className="mb-5 flex overflow-hidden rounded-lg border border-stone-800">
          <button
            type="button"
            onClick={() => switchTab("suggestion")}
            className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition ${
              tab === "suggestion" ? "bg-[#a32638] text-white" : "bg-stone-950 text-stone-400 hover:text-white"
            }`}
          >
            <Lightbulb size={14} /> Enviar sugestão
          </button>
          <button
            type="button"
            onClick={() => switchTab("bug")}
            className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition ${
              tab === "bug" ? "bg-[#a32638] text-white" : "bg-stone-950 text-stone-400 hover:text-white"
            }`}
          >
            <Bug size={14} /> Reportar bug
          </button>
        </div>

        {!settings.feedbackEnabled ? (
          <div className="rounded-lg border border-stone-800 bg-stone-950 px-4 py-8 text-center text-xs text-stone-500">
            Envio de sugestões e bugs está temporariamente desativado.
          </div>
        ) : success ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-stone-800 bg-stone-950 px-4 py-8 text-center">
            <CheckCircle2 size={32} className="text-[#a32638]" />
            <p className="text-sm font-medium text-white">Obrigado pelo seu feedback!</p>
            <p className="text-xs text-stone-500">Sua mensagem foi enviada com sucesso.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-lg bg-[#a32638] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#bd3347]"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "suggestion" ? (
              <>
                <div>
                  <label className={labelClass}>Título da sugestão</label>
                  <input
                    autoFocus
                    value={suggestion.title}
                    onChange={(e) => setSuggestion({ ...suggestion, title: e.target.value })}
                    placeholder="Ex: Modo de lista compacta"
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Descrição detalhada</label>
                  <textarea
                    value={suggestion.description}
                    onChange={(e) => setSuggestion({ ...suggestion, description: e.target.value })}
                    placeholder="Conte com detalhes a ideia ou melhoria…"
                    rows={4}
                    className={`${inputClass} resize-none`}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Categoria</label>
                  <select
                    value={suggestion.category}
                    onChange={(e) => setSuggestion({ ...suggestion, category: e.target.value })}
                    className={`${inputClass} text-xs font-medium`}
                    required
                  >
                    <option value="" disabled>
                      Selecione uma categoria
                    </option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Prioridade (opcional)</label>
                  <div className="flex overflow-hidden rounded-lg border border-stone-800">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          setSuggestion({ ...suggestion, priority: suggestion.priority === p ? undefined : p })
                        }
                        className={`flex-1 px-2 py-2 text-xs font-medium transition ${
                          suggestion.priority === p
                            ? "bg-[#a32638] text-white"
                            : "bg-stone-950 text-stone-400 hover:text-white"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className={labelClass}>Título do problema</label>
                  <input
                    autoFocus
                    value={bug.title}
                    onChange={(e) => setBug({ ...bug, title: e.target.value })}
                    placeholder="Ex: Botão de favoritar não responde"
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Descrição do bug</label>
                  <textarea
                    value={bug.description}
                    onChange={(e) => setBug({ ...bug, description: e.target.value })}
                    placeholder="O que está acontecendo?"
                    rows={3}
                    className={`${inputClass} resize-none`}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Passos para reproduzir</label>
                  <textarea
                    value={bug.stepsToReproduce}
                    onChange={(e) => setBug({ ...bug, stepsToReproduce: e.target.value })}
                    placeholder={"1. Abra…\n2. Clique em…\n3. Veja o erro"}
                    rows={3}
                    className={`${inputClass} resize-none`}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Comportamento esperado</label>
                    <textarea
                      value={bug.expectedBehavior}
                      onChange={(e) => setBug({ ...bug, expectedBehavior: e.target.value })}
                      rows={2}
                      className={`${inputClass} resize-none`}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Comportamento atual</label>
                    <textarea
                      value={bug.actualBehavior}
                      onChange={(e) => setBug({ ...bug, actualBehavior: e.target.value })}
                      rows={2}
                      className={`${inputClass} resize-none`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Gravidade</label>
                  <div className="flex overflow-hidden rounded-lg border border-stone-800">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setBug({ ...bug, priority: p })}
                        className={`flex-1 px-2 py-2 text-xs font-medium transition ${
                          bug.priority === p ? "bg-[#a32638] text-white" : "bg-stone-950 text-stone-400 hover:text-white"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Anexo (opcional)</label>
                  <label className="flex w-full cursor-pointer items-center gap-2 rounded-lg bg-stone-950 px-3 py-2.5 text-sm text-stone-400 hover:text-white">
                    <Paperclip size={14} className="shrink-0" />
                    <span className="truncate">{bug.attachment ? bug.attachment.name : "Anexar imagem ou arquivo"}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf,.txt"
                      className="hidden"
                      onChange={(e) => setBug({ ...bug, attachment: e.target.files?.[0] ?? null })}
                    />
                  </label>
                  {bug.attachment && (
                    <button
                      type="button"
                      onClick={() => setBug({ ...bug, attachment: null })}
                      className="mt-1 text-[11px] text-stone-500 hover:text-white"
                    >
                      Remover anexo
                    </button>
                  )}
                </div>
              </>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2.5 text-xs text-[#d97a86]">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || (tab === "suggestion" ? !suggestionValid : !bugValid)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#a32638] py-3 text-sm font-semibold text-white transition hover:bg-[#bd3347] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              {tab === "suggestion" ? "Enviar sugestão" : "Enviar reporte"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
