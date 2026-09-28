import { useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  AtSign,
  Clapperboard,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  Star,
  User,
} from "lucide-react";
import { getBackdropUrl, getPosterUrl } from "../services/tmdb";
import { translateAuthError } from "../services/supabase";
import { useAuthContext } from "../contexts/AuthContext";
import { isValidEmail, isValidTag } from "../utils/validation";
import { notifyRegistered } from "../utils/toast";
import { useAppSettings } from "../hooks/useAppSettings";
import type { TMDBMovie } from "../types";

interface AuthScreenProps {
  trending?: TMDBMovie[];
}

type Mode = "signup" | "login" | "reset";

// Illustrative statuses for the poster row — shows what the catalog does
// before the visitor has an account.
const SHOWCASE_STATUSES = ["Visto", "Assistindo", "Quero ver", "Visto"] as const;

const inputClass =
  "h-12 w-full rounded-xl border border-white/10 bg-black/30 pl-11 pr-4 text-white placeholder-stone-600 outline-none transition focus:border-[#bd3347] focus:bg-black/40 focus:ring-4 focus:ring-[#a32638]/20";

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

function Field({
  id,
  label,
  icon,
  hint,
  hintTone = "muted",
  aside,
  children,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  hint?: string;
  hintTone?: "muted" | "error";
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-stone-300">
          {label}
        </label>
        {aside}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">{icon}</span>
        {children}
      </div>
      {hint && (
        <p className={`mt-1.5 text-xs ${hintTone === "error" ? "text-[#d97a86]" : "text-stone-500"}`}>{hint}</p>
      )}
    </div>
  );
}

function Showcase({ trending }: { trending: TMDBMovie[] }) {
  const featured = trending.find((m) => m.backdrop_path) ?? null;
  const backdrop = getBackdropUrl(featured?.backdrop_path, "w1280");
  const posters = trending.filter((m) => m.poster_path && m.id !== featured?.id).slice(0, 4);
  const featuredTitle = featured?.title ?? featured?.name;
  const featuredYear = (featured?.release_date ?? featured?.first_air_date)?.slice(0, 4);

  return (
    <section className="relative isolate flex h-56 flex-col justify-end overflow-hidden sm:h-72 lg:h-auto lg:min-h-screen lg:p-14 xl:p-16">
      {backdrop && (
        <img
          src={backdrop}
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover motion-safe:animate-[auth-drift_40s_ease-in-out_infinite_alternate]"
        />
      )}
      <div className="absolute inset-0 -z-10 bg-linear-to-t from-[#0e0c0a] via-[#0e0c0a]/60 to-[#0e0c0a]/20 lg:bg-linear-to-r lg:from-[#0e0c0a]/10 lg:via-[#0e0c0a]/50 lg:to-[#0e0c0a]" />
      <div className="absolute inset-0 -z-10 hidden bg-linear-to-t from-[#0e0c0a] via-transparent to-[#0e0c0a]/60 lg:block" />

      <div className="absolute left-5 top-5 flex items-center gap-2.5 sm:left-8 sm:top-7 lg:left-14 lg:top-12 xl:left-16">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#a32638] shadow-lg shadow-[#a32638]/30">
          <Clapperboard size={18} className="text-white" />
        </span>
        <span className="font-display text-xl font-semibold tracking-tight text-white">Catalog</span>
      </div>

      <div className="hidden max-w-xl lg:block">
        <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-white xl:text-6xl">
          Tudo que você assistiu. Tudo que ainda vai ver.
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-stone-300">
          Marque filmes e séries, dê sua nota e veja o que seus amigos estão assistindo.
        </p>

        {posters.length > 0 && (
          <ul className="mt-10 flex gap-4" aria-hidden="true">
            {posters.map((movie, i) => (
              <li
                key={movie.id}
                className={`w-28 shrink-0 xl:w-32 ${i % 2 === 1 ? "translate-y-4" : ""}`}
              >
                <div className="relative overflow-hidden rounded-lg shadow-2xl shadow-black/60 ring-1 ring-white/10">
                  <img
                    src={getPosterUrl(movie.poster_path, "w342") ?? ""}
                    alt=""
                    loading="lazy"
                    className="aspect-2/3 w-full object-cover"
                  />
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                    {SHOWCASE_STATUSES[i]}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-stone-400">
                  <Star size={11} className="fill-[#d9a441] text-[#d9a441]" />
                  {(movie.vote_average / 2).toFixed(1)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {featuredTitle && (
        <p className="absolute bottom-4 right-5 hidden text-[11px] text-stone-500 lg:block">
          Em alta: {featuredTitle}
          {featuredYear ? ` (${featuredYear})` : ""}
        </p>
      )}
    </section>
  );
}

export function AuthScreen({ trending = [] }: AuthScreenProps) {
  const { signUp, logIn, logInWithGoogle, resetPassword } = useAuthContext();
  const { settings: appSettings } = useAppSettings();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const busy = loading || googleLoading;
  const signupBlocked = mode === "signup" && !appSettings.signupEnabled;
  // The field shows a fixed "@" prefix, so the user types only the handle.
  const fullTag = `@${tag.replace(/^@+/, "")}`;

  function clearErrorOnEdit() {
    if (error) setError(null);
  }

  function validate(): string | null {
    if (mode === "reset") {
      if (!isValidEmail(email)) return "Informe um e-mail válido.";
      return null;
    }
    if (signupBlocked) return "Cadastro temporariamente desativado.";
    if (mode === "signup" && name.trim().length < 2) return "Informe seu nome completo.";
    if (mode === "signup" && !isValidTag(fullTag))
      return "Informe uma TAG válida: 3 a 20 letras, números ou _.";
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
        await signUp(name.trim(), email.trim(), password, fullTag.trim());
        notifyRegistered();
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

  const errorBox = error && (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-[#a32638]/40 bg-[#a32638]/10 px-3.5 py-3 text-sm text-[#f0b8bf]"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0 text-[#d97a86]" />
      {error}
    </div>
  );

  const submitButton = (label: string, disabled = false) => (
    <button
      type="submit"
      disabled={busy || disabled}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#a32638] text-[15px] font-semibold text-white shadow-lg shadow-[#a32638]/25 transition hover:bg-[#bd3347] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#bd3347]/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading && <Loader2 size={17} className="animate-spin" />}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0e0c0a] lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(440px,1fr)]">
      <Showcase trending={trending} />

      <main className="relative flex justify-center px-5 pb-12 sm:px-8 lg:items-center lg:border-l lg:border-white/5 lg:bg-[#15120f] lg:py-12">
        <div className="-mt-6 w-full max-w-[400px] sm:-mt-10 lg:mt-0">
          {mode === "reset" ? (
            resetSent ? (
              <div className="motion-safe:animate-[auth-in_.35s_ease-out]">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#a32638]/15">
                  <MailCheck size={22} className="text-[#d97a86]" />
                </span>
                <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-white">
                  Verifique seu e-mail
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-stone-400">
                  Se <span className="font-medium text-stone-200">{email.trim()}</span> tiver uma conta, enviamos
                  um link para você criar uma nova senha. Confira também a caixa de spam.
                </p>
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-sm font-semibold text-white transition hover:bg-white/5"
                >
                  <ArrowLeft size={16} /> Voltar para o login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="motion-safe:animate-[auth-in_.35s_ease-out]">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="-ml-1 flex items-center gap-1.5 rounded-md px-1 py-1 text-sm text-stone-400 transition hover:text-white"
                >
                  <ArrowLeft size={15} /> Voltar
                </button>
                <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white">
                  Redefinir senha
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-stone-400">
                  Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.
                </p>

                <div className="mt-8 space-y-5">
                  <Field id="reset-email" label="E-mail" icon={<Mail size={17} />}>
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
                      className={inputClass}
                    />
                  </Field>
                  {errorBox}
                  {submitButton("Enviar link")}
                </div>
              </form>
            )
          ) : (
            <div className="rounded-2xl border border-white/5 bg-[#15120f] p-6 shadow-2xl shadow-black/50 sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-white">
                {mode === "login" ? "Que bom te ver de novo" : "Crie sua conta"}
              </h2>
              <p className="mt-2 text-[15px] text-stone-400">
                {mode === "login"
                  ? "Entre para continuar seu catálogo."
                  : "Leva menos de um minuto. É grátis."}
              </p>

              <div role="tablist" aria-label="Acesso" className="mt-7 grid grid-cols-2 rounded-xl bg-black/30 p-1 ring-1 ring-white/5">
                {(["login", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => switchMode(m)}
                    className={`h-10 rounded-lg text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd3347] ${
                      mode === m ? "bg-[#2a2420] text-white shadow" : "text-stone-400 hover:text-white"
                    }`}
                  >
                    {m === "login" ? "Entrar" : "Criar conta"}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={busy || signupBlocked}
                className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white text-[15px] font-semibold text-stone-900 transition hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {googleLoading ? <Loader2 size={18} className="animate-spin" /> : <GoogleLogo />}
                Continuar com Google
              </button>

              <div className="my-6 flex items-center gap-3 text-xs text-stone-500">
                <div className="h-px flex-1 bg-white/10" />
                ou com e-mail
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <form key={mode} onSubmit={handleSubmit} noValidate className="space-y-5 motion-safe:animate-[auth-in_.3s_ease-out]">
                {signupBlocked && (
                  <p className="rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 text-sm text-stone-400">
                    Cadastro temporariamente desativado. Tente novamente mais tarde.
                  </p>
                )}

                {mode === "signup" && (
                  <>
                    <Field id="signup-name" label="Nome completo" icon={<User size={17} />}>
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
                        className={inputClass}
                      />
                    </Field>

                    <Field
                      id="signup-tag"
                      label="TAG"
                      icon={<AtSign size={17} />}
                      hint="É como seus amigos te encontram e te mencionam. 3 a 20 letras, números ou _."
                    >
                      <input
                        id="signup-tag"
                        value={tag}
                        onChange={(e) => {
                          setTag(e.target.value.replace(/^@+/, ""));
                          clearErrorOnEdit();
                        }}
                        placeholder="suatag"
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        maxLength={20}
                        className={inputClass}
                      />
                    </Field>
                  </>
                )}

                <Field id="auth-email" label="E-mail" icon={<Mail size={17} />}>
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
                    className={inputClass}
                  />
                </Field>

                <Field
                  id="auth-password"
                  label="Senha"
                  icon={<Lock size={17} />}
                  hint={mode === "signup" ? "Mínimo de 6 caracteres." : undefined}
                  hintTone={mode === "signup" && password.length > 0 && password.length < 6 ? "error" : "muted"}
                  aside={
                    mode === "login" && (
                      <button
                        type="button"
                        onClick={() => switchMode("reset")}
                        className="text-sm font-medium text-[#d97a86] transition hover:text-[#f0b8bf]"
                      >
                        Esqueceu a senha?
                      </button>
                    )
                  }
                >
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearErrorOnEdit();
                    }}
                    placeholder={mode === "signup" ? "Crie uma senha" : "Sua senha"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-stone-500 transition hover:bg-white/5 hover:text-white"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </Field>

                {errorBox}

                <div className="pt-1">{submitButton(mode === "signup" ? "Criar conta" : "Entrar", signupBlocked)}</div>
              </form>

              <p className="mt-6 text-center text-xs leading-relaxed text-stone-500">
                Ao continuar, você concorda com os Termos de uso e a Política de privacidade.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
