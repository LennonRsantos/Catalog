import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  ShieldAlert,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import type { User } from "../types";
import { useAuthContext } from "../contexts/AuthContext";
import { translateAuthError } from "../services/firebase";
import { AvatarUploadError, deleteAvatarFile, uploadAvatarFile } from "../services/storage";
import { isValidBirthdate, isValidEmail, isValidTag } from "../utils/validation";
import { useEscapeClose } from "../hooks/useEscapeClose";

function mapTagError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code;
  if (code === "app/tag-taken") return "Essa TAG já está em uso. Escolha outra.";
  if (code === "app/invalid-tag") return "TAG inválida. Use # seguido de 3 a 20 letras, números ou _.";
  return "Não foi possível salvar a TAG. Tente de novo.";
}

interface PersonalDataModalProps {
  open: boolean;
  onClose: () => void;
  profile: User;
  onSave: (user: User) => void;
}

interface SectionState {
  submitting: boolean;
  error: string | null;
  success: string | null;
}

const IDLE: SectionState = { submitting: false, error: null, success: null };

function Feedback({ state }: { state: SectionState }) {
  if (state.error) {
    return (
      <p className="flex items-start gap-1.5 text-xs text-[#d97a86]" aria-live="polite">
        <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p className="flex items-start gap-1.5 text-xs text-green-400" aria-live="polite">
        <CheckCircle2 size={13} className="mt-0.5 shrink-0" /> {state.success}
      </p>
    );
  }
  return null;
}

export function PersonalDataModal({ open, onClose, profile, onSave }: PersonalDataModalProps) {
  const { firebaseUser, authProvider, changeEmail, changePassword, changeHandle, deleteAccount } =
    useAuthContext();

  const [name, setName] = useState(profile.name);
  const [birthdate, setBirthdate] = useState(profile.birthdate ?? "");
  const [avatarPreview, setAvatarPreview] = useState(profile.avatarUrl ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [birthdateError, setBirthdateError] = useState<string | null>(null);
  const [mainState, setMainState] = useState<SectionState>(IDLE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tagOpen, setTagOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [tagState, setTagState] = useState<SectionState>(IDLE);

  const [emailOpen, setEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailState, setEmailState] = useState<SectionState>(IDLE);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordState, setPasswordState] = useState<SectionState>(IDLE);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteState, setDeleteState] = useState<SectionState>(IDLE);

  useEffect(() => {
    if (!open) return;
    setName(profile.name);
    setBirthdate(profile.birthdate ?? "");
    setAvatarPreview(profile.avatarUrl ?? "");
    setAvatarFile(null);
    setAvatarRemoved(false);
    setAvatarError(null);
    setNameError(null);
    setBirthdateError(null);
    setMainState(IDLE);
    setTagOpen(false);
    setNewTag(profile.handle ?? "");
    setTagState(IDLE);
    setEmailOpen(false);
    setNewEmail("");
    setEmailPassword("");
    setEmailState(IDLE);
    setPasswordOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordState(IDLE);
    setDeleteOpen(false);
    setDeletePassword("");
    setDeleteConfirmText("");
    setDeleteState(IDLE);
  }, [open, profile]);

  useEscapeClose(onClose, open);
  if (!open) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Imagem muito grande. Máximo de 5MB.");
      return;
    }
    setAvatarError(null);
    setAvatarFile(file);
    setAvatarRemoved(false);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleRemoveAvatar() {
    setAvatarFile(null);
    setAvatarRemoved(true);
    setAvatarPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleMainSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nameErr = name.trim().length < 2 ? "Informe seu nome completo." : null;
    const birthdateErr = birthdate && !isValidBirthdate(birthdate) ? "Data de nascimento inválida." : null;
    setNameError(nameErr);
    setBirthdateError(birthdateErr);
    if (nameErr || birthdateErr) return;

    setMainState({ submitting: true, error: null, success: null });
    try {
      let avatarUrl = profile.avatarUrl;
      if (avatarFile && firebaseUser) {
        avatarUrl = await uploadAvatarFile(firebaseUser.uid, avatarFile);
        deleteAvatarFile(profile.avatarUrl).catch(() => {});
      } else if (avatarRemoved) {
        deleteAvatarFile(profile.avatarUrl).catch(() => {});
        avatarUrl = undefined;
      }

      onSave({ ...profile, name: name.trim(), birthdate: birthdate || undefined, avatarUrl });
      setAvatarFile(null);
      setAvatarRemoved(false);
      setMainState({ submitting: false, error: null, success: "Salvo!" });
      setTimeout(() => setMainState(IDLE), 2000);
    } catch (err) {
      const message = err instanceof AvatarUploadError ? err.message : "Não foi possível salvar. Tente de novo.";
      setMainState({ submitting: false, error: message, success: null });
    }
  }

  async function handleChangeTag(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newTag.trim();
    if (!isValidTag(trimmed)) {
      setTagState({
        submitting: false,
        error: "Use # seguido de 3 a 20 letras, números ou _.",
        success: null,
      });
      return;
    }

    setTagState({ submitting: true, error: null, success: null });
    try {
      await changeHandle(trimmed);
      setTagState({ submitting: false, error: null, success: "TAG atualizada!" });
      setTimeout(() => {
        setTagState(IDLE);
        setTagOpen(false);
      }, 1200);
    } catch (err) {
      setTagState({ submitting: false, error: mapTagError(err), success: null });
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(newEmail)) {
      setEmailState({ submitting: false, error: "Informe um e-mail válido.", success: null });
      return;
    }
    if (authProvider === "password" && !emailPassword) {
      setEmailState({ submitting: false, error: "Confirme sua senha atual.", success: null });
      return;
    }

    setEmailState({ submitting: true, error: null, success: null });
    try {
      await changeEmail(newEmail.trim(), emailPassword);
      setEmailState({
        submitting: false,
        error: null,
        success: `Enviamos um link de confirmação pra ${newEmail.trim()}. Seu e-mail só muda depois que você confirmar por lá.`,
      });
      setNewEmail("");
      setEmailPassword("");
    } catch (err) {
      setEmailState({ submitting: false, error: translateAuthError(err), success: null });
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordState({
        submitting: false,
        error: "A nova senha deve ter ao menos 6 caracteres.",
        success: null,
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordState({ submitting: false, error: "As senhas não coincidem.", success: null });
      return;
    }

    setPasswordState({ submitting: true, error: null, success: null });
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordState({ submitting: false, error: null, success: "Senha alterada com sucesso." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordOpen(false), 1500);
    } catch (err) {
      setPasswordState({ submitting: false, error: translateAuthError(err), success: null });
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText.trim().toLowerCase() !== profile.email.trim().toLowerCase()) {
      setDeleteState({ submitting: false, error: "Digite seu e-mail exatamente pra confirmar.", success: null });
      return;
    }

    setDeleteState({ submitting: true, error: null, success: null });
    try {
      await deleteAccount(deletePassword);
      // onAuthStateChanged cuida do resto: a sessão cai e o app volta pra AuthScreen sozinho.
    } catch (err) {
      setDeleteState({ submitting: false, error: translateAuthError(err), success: null });
    }
  }

  const inputClass =
    "w-full rounded-lg border border-stone-800 bg-stone-950 px-3 py-2.5 text-sm text-white placeholder-stone-600 outline-none focus:border-[#a32638]";
  const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-stone-800 bg-stone-900 p-6 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <UserIcon size={18} className="text-[#a32638]" /> Dados Pessoais
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-800 hover:text-white"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleMainSubmit} className="space-y-5">
          {/* Foto de perfil */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Foto de Perfil</h3>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-800 bg-stone-950">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <UserIcon size={28} className="text-stone-700" />
                )}
              </div>
              <div className="flex flex-1 flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg border border-stone-800 bg-stone-950 px-3 py-2 text-xs font-medium text-stone-300 transition hover:border-stone-700 hover:text-white"
                >
                  <Camera size={13} /> Alterar foto
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="flex items-center gap-1.5 rounded-lg border border-stone-800 bg-stone-950 px-3 py-2 text-xs font-medium text-stone-400 transition hover:border-red-900 hover:text-[#d97a86]"
                  >
                    <Trash2 size={13} /> Remover foto
                  </button>
                )}
              </div>
            </div>
            {avatarError && (
              <p className="flex items-center gap-1.5 text-xs text-[#d97a86]">
                <AlertTriangle size={12} /> {avatarError}
              </p>
            )}
          </section>

          {/* Informações pessoais */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Informações Pessoais
            </h3>

            <div>
              <label className={labelClass} htmlFor="personal-name">
                Nome
              </label>
              <input
                id="personal-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
                autoComplete="name"
                required
                className={inputClass}
              />
              {nameError && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-[#d97a86]" aria-live="polite">
                  <AlertTriangle size={12} /> {nameError}
                </p>
              )}
            </div>

            <div>
              <label className={labelClass} htmlFor="personal-birthdate">
                Data de Nascimento
              </label>
              <input
                id="personal-birthdate"
                type="date"
                value={birthdate}
                onChange={(e) => {
                  setBirthdate(e.target.value);
                  setBirthdateError(null);
                }}
                max={new Date().toISOString().slice(0, 10)}
                autoComplete="bday"
                className={inputClass}
              />
              {birthdateError && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-[#d97a86]" aria-live="polite">
                  <AlertTriangle size={12} /> {birthdateError}
                </p>
              )}
            </div>

          </section>

          <Feedback state={mainState} />

          {/* Ações principais */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={mainState.submitting}
              className="flex-1 rounded-lg border border-stone-800 bg-stone-950 py-3 text-sm font-medium text-stone-300 transition hover:border-stone-700 hover:text-white disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mainState.submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#a32638] py-3 text-sm font-semibold text-white transition hover:bg-[#bd3347] active:scale-[0.99] disabled:opacity-60"
            >
              {mainState.submitting && <Loader2 size={15} className="animate-spin" />}
              Salvar Alterações
            </button>
          </div>
        </form>

        {/* Informações da conta */}
        <section className="mt-6 space-y-3 border-t border-stone-800 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Informações da Conta
          </h3>

          <div className="rounded-lg border border-stone-800 bg-stone-950 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">TAG</p>
                <p className="truncate text-sm text-white">{profile.handle ?? "Gerando…"}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewTag(profile.handle ?? "");
                  setTagOpen((v) => !v);
                }}
                className="shrink-0 text-xs font-medium text-[#bd3347] hover:text-[#d97a86]"
              >
                {tagOpen ? "Cancelar" : "Alterar"}
              </button>
            </div>

            {tagOpen && (
              <form onSubmit={handleChangeTag} className="mt-3 space-y-2 border-t border-stone-800 pt-3">
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="#suatag"
                  aria-label="Nova TAG"
                  autoComplete="off"
                  spellCheck={false}
                  required
                  className={inputClass}
                />
                <p className="text-[11px] text-stone-600">
                  Compartilhe pra outras pessoas te encontrarem. Precisa ser única.
                </p>
                <Feedback state={tagState} />
                <button
                  type="submit"
                  disabled={tagState.submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#a32638] py-2.5 text-xs font-semibold text-white transition hover:bg-[#bd3347] disabled:opacity-60"
                >
                  {tagState.submitting && <Loader2 size={13} className="animate-spin" />}
                  Salvar TAG
                </button>
              </form>
            )}
          </div>

          <div className="rounded-lg border border-stone-800 bg-stone-950 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-stone-500">
                  <Mail size={12} /> E-mail
                </p>
                <p className="truncate text-sm text-white">{profile.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setEmailOpen((v) => !v)}
                className="shrink-0 text-xs font-medium text-[#bd3347] hover:text-[#d97a86]"
              >
                {emailOpen ? "Cancelar" : "Alterar"}
              </button>
            </div>

            {emailOpen && (
              <form onSubmit={handleChangeEmail} className="mt-3 space-y-2 border-t border-stone-800 pt-3">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Novo e-mail"
                  aria-label="Novo e-mail"
                  autoComplete="email"
                  spellCheck={false}
                  required
                  className={inputClass}
                />
                {authProvider === "password" && (
                  <input
                    type="password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    placeholder="Senha atual"
                    aria-label="Senha atual"
                    autoComplete="current-password"
                    required
                    className={inputClass}
                  />
                )}
                <Feedback state={emailState} />
                <button
                  type="submit"
                  disabled={emailState.submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#a32638] py-2.5 text-xs font-semibold text-white transition hover:bg-[#bd3347] disabled:opacity-60"
                >
                  {emailState.submitting && <Loader2 size={13} className="animate-spin" />}
                  {authProvider === "google.com" ? "Confirmar com Google e enviar" : "Enviar confirmação"}
                </button>
              </form>
            )}
          </div>

          <div className="rounded-lg border border-stone-800 bg-stone-950 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-stone-500">
                  <Lock size={12} /> Senha
                </p>
                <p className="text-sm text-white">
                  {authProvider === "google.com" ? "Login via Google" : "••••••••"}
                </p>
              </div>
              {authProvider === "password" && (
                <button
                  type="button"
                  onClick={() => setPasswordOpen((v) => !v)}
                  className="shrink-0 text-xs font-medium text-[#bd3347] hover:text-[#d97a86]"
                >
                  {passwordOpen ? "Cancelar" : "Alterar"}
                </button>
              )}
            </div>

            {authProvider === "google.com" ? (
              <p className="mt-1 text-[11px] text-stone-600">Você entra com o Google — não há senha por aqui.</p>
            ) : (
              passwordOpen && (
                <form onSubmit={handleChangePassword} className="mt-3 space-y-2 border-t border-stone-800 pt-3">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Senha atual"
                    aria-label="Senha atual"
                    autoComplete="current-password"
                    required
                    className={inputClass}
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nova senha (mín. 6 caracteres)"
                    aria-label="Nova senha"
                    autoComplete="new-password"
                    required
                    className={inputClass}
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmar nova senha"
                    aria-label="Confirmar nova senha"
                    autoComplete="new-password"
                    required
                    className={inputClass}
                  />
                  <Feedback state={passwordState} />
                  <button
                    type="submit"
                    disabled={passwordState.submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#a32638] py-2.5 text-xs font-semibold text-white transition hover:bg-[#bd3347] disabled:opacity-60"
                  >
                    {passwordState.submitting && <Loader2 size={13} className="animate-spin" />}
                    Alterar Senha
                  </button>
                </form>
              )
            )}
          </div>
        </section>

        {/* Zona de perigo */}
        <section className="mt-6 space-y-2 rounded-lg border border-red-900/40 bg-red-950/10 p-3">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#bd3347]">
            <ShieldAlert size={13} /> Zona de Perigo
          </h3>

          {!deleteOpen ? (
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-[#d97a86] hover:text-red-300"
            >
              <Trash2 size={13} /> Excluir Conta
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-stone-400">
                Isso apaga sua conta, catálogo e perfil permanentemente. Não tem como desfazer.
              </p>
              {authProvider === "password" && (
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Sua senha atual"
                  aria-label="Sua senha atual"
                  autoComplete="current-password"
                  className={inputClass}
                />
              )}
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={`Digite "${profile.email}" pra confirmar`}
                aria-label={`Digite ${profile.email} para confirmar exclusão`}
                autoComplete="off"
                spellCheck={false}
                className={inputClass}
              />
              <Feedback state={deleteState} />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteOpen(false);
                    setDeleteState(IDLE);
                    setDeletePassword("");
                    setDeleteConfirmText("");
                  }}
                  disabled={deleteState.submitting}
                  className="flex-1 rounded-lg border border-stone-800 bg-stone-950 py-2.5 text-xs font-medium text-stone-300 transition hover:text-white disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={
                    deleteState.submitting ||
                    deleteConfirmText.trim().toLowerCase() !== profile.email.trim().toLowerCase()
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#a32638] py-2.5 text-xs font-semibold text-white transition hover:bg-[#bd3347] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deleteState.submitting && <Loader2 size={13} className="animate-spin" />}
                  Excluir Permanentemente
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
