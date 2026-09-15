// TAGs used to be "#xxxx"; they're now "@xxxx" (see validation.ts's TAG_RE).
// Normalizes any legacy "#"-prefixed value read from old data so display and
// mention-matching never have to special-case the old symbol.
export function normalizeHandle(raw: string | undefined | null): string {
  if (!raw) return "";
  return `@${raw.replace(/^[#@]/, "")}`;
}
