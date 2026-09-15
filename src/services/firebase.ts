import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
export const storage = getStorage(app);

export function translateAuthError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? "";

  switch (code) {
    case "auth/email-already-in-use":
      return "Este e-mail já está cadastrado.";
    case "auth/invalid-email":
      return "E-mail inválido.";
    case "auth/weak-password":
      return "Senha muito fraca. Use ao menos 6 caracteres.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "E-mail ou senha incorretos.";
    case "auth/missing-password":
      return "Informe sua senha.";
    case "auth/missing-email":
      return "Informe seu e-mail.";
    case "auth/user-disabled":
      return "Esta conta foi desativada.";
    case "auth/operation-not-allowed":
      return "Esse método de login não está habilitado. Fale com o suporte.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Login com Google cancelado.";
    case "auth/popup-blocked":
      return "O navegador bloqueou a janela do Google. Permita pop-ups e tente de novo.";
    case "auth/account-exists-with-different-credential":
      return "Este e-mail já está cadastrado com outro método de login.";
    case "auth/network-request-failed":
      return "Falha de conexão. Verifique sua internet e tente novamente.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde um momento e tente novamente.";
    case "auth/internal-error":
      return "Erro interno do servidor. Tente novamente em instantes.";
    case "auth/requires-recent-login":
      return "Por segurança, confirme sua senha atual pra continuar.";
    case "app/tag-taken":
      return "Essa TAG já está em uso. Escolha outra.";
    case "app/invalid-tag":
      return "TAG inválida. Use # seguido de 3 a 20 letras, números ou _.";
    default:
      return "Não foi possível concluir. Tente novamente.";
  }
}
