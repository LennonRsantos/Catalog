import { toast, type ToastOptions } from "react-toastify";

// Every screen fires notifications through these five helpers instead of
// calling `toast()` directly, so copy and behavior stay consistent across
// the app (and there's one place to retune timing/position later).
const BASE_OPTIONS: ToastOptions = {
  position: "bottom-right",
};

export function notifyRegistered(message = "Usuário registrado!") {
  toast.success(message, BASE_OPTIONS);
}

export function notifySaved(message = "Configurações salvas.") {
  toast.success(message, BASE_OPTIONS);
}

export function notifyUpdated(message = "Item atualizado.") {
  toast.success(message, BASE_OPTIONS);
}

export function notifyRemoved(message = "Item removido.") {
  toast.info(message, BASE_OPTIONS);
}

export function notifyError(message = "Não foi possível salvar as alterações. Tente novamente.") {
  toast.error(message, BASE_OPTIONS);
}
