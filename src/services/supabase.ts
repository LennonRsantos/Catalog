import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Supabase AuthError carries a stable machine-readable `.code` (GoTrue's own
// error codes, e.g. "email_address_invalid", "user_already_exists") — match
// on that first. Message substring matching is only a fallback, for errors
// with no code (network failures, raw PostgREST/Postgres errors, etc.) —
// verified live against this project that message text alone is NOT
// reliable (e.g. GoTrue's actual text is "...is invalid", not "invalid
// email", so a naive "invalid email" substring check silently never matches).
export function translateAuthError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? "";
  const message = ((err as { message?: string } | null)?.message ?? "").toLowerCase();

  switch (code) {
    case "user_already_exists":
      return "Este e-mail já está cadastrado.";
    case "email_address_invalid":
    case "validation_failed":
      return "E-mail inválido.";
    case "email_address_not_authorized":
      return "Esse e-mail não está autorizado a se cadastrar.";
    case "invalid_credentials":
      return "E-mail ou senha incorretos.";
    case "email_not_confirmed":
      return "Confirme seu e-mail antes de entrar.";
    case "weak_password":
      return "Senha muito fraca. Use ao menos 6 caracteres.";
    case "same_password":
      return "A nova senha precisa ser diferente da atual.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Muitas tentativas. Aguarde um momento e tente novamente.";
    case "signup_disabled":
      return "Cadastro desativado no momento.";
    case "session_not_found":
    case "refresh_token_not_found":
    case "refresh_token_already_used":
      return "Sessão expirada. Entre novamente.";
  }

  if (message.includes("already registered") || message.includes("already been registered")) {
    return "Este e-mail já está cadastrado.";
  }
  if (message.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (message.includes("password") && (message.includes("at least") || message.includes("short") || message.includes("weak"))) {
    return "Senha muito fraca. Use ao menos 6 caracteres.";
  }
  if (message.includes("email") && message.includes("invalid")) return "E-mail inválido.";
  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "Muitas tentativas. Aguarde um momento e tente novamente.";
  }
  if (message.includes("network") || message.includes("fetch")) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }
  if (message.includes("popup closed") || message.includes("popup_closed")) return "Login com Google cancelado.";
  if (message.includes("database error saving new user")) {
    // Almost always the handle-collision race (see is_handle_available in
    // useAuth.ts, which is what normally catches this before we even get
    // here) — anything else landing here is genuinely unexpected.
    return "Não foi possível concluir o cadastro. Tente novamente.";
  }
  return "Não foi possível concluir. Tente novamente.";
}
