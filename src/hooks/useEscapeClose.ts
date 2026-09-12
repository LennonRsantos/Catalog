import { useEffect } from "react";

// Lets Escape dismiss a modal/dropdown, matching native dialog behavior.
// `enabled` lets callers pass their open/closed state directly instead of
// conditionally calling the hook, which would break the rules of hooks.
export function useEscapeClose(onClose: () => void, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onClose]);
}
