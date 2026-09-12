import { useState } from "react";
import { ArrowLeft, CheckCircle2, Clapperboard, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { getBackdropUrl } from "../services/tmdb";
import { translateAuthError } from "../services/firebase";
import { useAuthContext } from "../contexts/AuthContext";
import { isValidEmail } from "../utils/validation";

interface AuthScreenProps {
  backdropPath?: string | null;
}

type Mode = "signup" | "login" | "reset";

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path fill="#FBBC05" d="M3.97 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3.01-2.33Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function AuthScreen({ backdropPath }: AuthScreenProps) {
  const { signUp, logIn, logInWithGoogle, resetPassword } = useAuthContext();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const backdrop = getBackdropUrl(backdropPath, "w1280");
  const busy = loading || googleLoading;

  function clearErrorOnEdit() {
    if (error) setError(null);
  }

  function validate(): string | null {
    if (mode === "reset") {
      if (!isValidEmail(email)) return "Informe um e-mail válido.";
      return null;
    }
    if (mode === "signup" && name.trim().length < 2) return "Informe seu nome completo.";
    if (!isValidEmail(email)) return "Informe um e-mail válido.";
    if (password.length < 6) return "A senha deve ter ao menos 6 caracteres.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        await signUp(name.trim(), email.trim(), password);
      } else if (mode === "login") {
        await logIn(email.trim(), password);
      } else {
        await resetPassword(email.trim());
        setResetSent(true);
      }
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleAuth() {
    setError(null);
    setGoogleLoading(true);
    try {
      await logInWithGoogle();
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setResetSent(false);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0e0c0a] px-4 py-10">
      {backdrop && (
        <img src={backdrop} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-[#0e0c0a] via-[#0e0c0a]/95 to-[#0e0c0a]/70" />

      <div className="relative w-full max-w-md rounded-2xl border border-stone-800 bg-stone-900/90 p-6 shadow-2xl backdrop-blur sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2">
            <Clapperboard className="text-[#a32638]" size={24} />
            <span className="font-display text-2xl font-semibold tracking-tight text-white">Meu Catálogo</span>
          </div>
          <p className="text-sm text-stone-400">
            {mode === "signup"
              ? "Crie sua conta para começar"
              : mode === "login"
                ? "Entre na sua conta"
                : "Redefinir senha"}
          </p>
        </div>

        {mode === "reset" ? (
          resetSent ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 size={36} className="text-[#a32638]" />
              <p className="text-sm text-white">Verifique seu e-mail</p>
              <p className="text-xs text-stone-400">
                Se <span className="text-stone-300">{email.trim()}</span> tiver uma conta, enviamos um link
                para redefinir sua senha.
              </p>
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#bd3347] hover:text-[#d97a86]"
              >
                <ArrowLeft size={13} /> Voltar para o login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-stone-500">
                Informe o e-mail da sua conta e enviaremos um link para você criar uma nova senha.
              </p>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-400" htmlFor="reset-email">
                  E-mail
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearErrorOnEdit();
                    }}
                    placeholder="voce@email.com"
                    autoComplete="email"
                    spellCheck={false}
                    autoFocus
                    className="w-full rounded-lg border border-stone-800 bg-stone-950 py-2.5 pl-9 pr-3 text-sm text-white placeholder-stone-600 outline-none focus:border-[#a32638]"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-[#d97a86]" aria-live="polite">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#a32638] py-3 text-sm font-semibold text-white transition hover:bg-[#bd3347] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Enviar link de redefinição
              </button>

              <button
                type="button"
                onClick={() => switchMode("login")}
                className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-stone-400 hover:text-white"
              >
                <ArrowLeft size={13} /> Voltar para o login
              </button>
            </form>
          )
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-400" htmlFor="signup-name">
                    Nome Completo
                  </label>
                  <input
                    id="signup-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearErrorOnEdit();
                    }}
                    placeholder="Seu nome"
                    autoComplete="name"
                    autoFocus
                    className="w-full rounded-lg border border-stone-800 bg-stone-950 px-3 py-2.5 text-sm text-white placeholder-stone-600 outline-none focus:border-[#a32638]"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-400" htmlFor="auth-email">
                  E-mail
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearErrorOnEdit();
                  }}
                  placeholder="voce@email.com"
                  autoComplete="email"
                  spellCheck={false}
                  autoFocus={mode === "login"}
                  className="w-full rounded-lg border border-stone-800 bg-stone-950 px-3 py-2.5 text-sm text-white placeholder-stone-600 outline-none focus:border-[#a32638]"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-medium uppercase tracking-wide text-stone-400" htmlFor="auth-password">
                    Senha
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => switchMode("reset")}
                      className="text-xs font-medium text-[#bd3347] hover:text-[#d97a86]"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearErrorOnEdit();
                    }}
                    placeholder="••••••••"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className="w-full rounded-lg border border-stone-800 bg-stone-950 px-3 py-2.5 pr-10 text-sm text-white placeholder-stone-600 outline-none focus:border-[#a32638]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 transition hover:text-white"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {mode === "signup" && (
                  <p className={`mt-1.5 text-[11px] ${password.length > 0 && password.length < 6 ? "text-[#d97a86]" : "text-stone-500"}`}>
                    Mínimo de 6 caracteres
                  </p>
                )}
              </div>

              {error && <p className="text-xs text-[#d97a86]" aria-live="polite">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#a32638] py-3 text-sm font-semibold text-white transition hover:bg-[#bd3347] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {mode === "signup" ? "Criar Conta" : "Entrar"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-stone-800" />
              <span className="text-[11px] uppercase tracking-wide text-stone-500">ou continue com</span>
              <div className="h-px flex-1 bg-stone-800" />
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-stone-800 bg-stone-950 py-3 text-sm font-medium text-white transition hover:border-stone-700 hover:bg-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {googleLoading ? <Loader2 size={16} className="animate-spin" /> : <GoogleLogo />}
              Continuar com o Google
            </button>

            <p className="mt-6 text-center text-xs text-stone-500">
              {mode === "signup" ? (
                <>
                  Já tem uma conta?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="font-medium text-[#bd3347] hover:text-[#d97a86]"
                  >
                    Entrar
                  </button>
                </>
              ) : (
                <>
                  Não tem uma conta?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="font-medium text-[#bd3347] hover:text-[#d97a86]"
                  >
                    Criar conta
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
