// Formats elapsed watch progress ("onde parou") as e.g. "1h 05min 20s".
// Omits the hours segment when zero; always shows seconds so a paused
// point is reproducible exactly, not just to the nearest minute.
export function formatWatchedTime(minutes = 0, seconds = 0): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${String(mins).padStart(hours > 0 ? 2 : 1, "0")}min`);
  parts.push(`${String(seconds).padStart(2, "0")}s`);
  return parts.join(" ");
}

export function timeAgo(createdAt: number): string {
  const diffMs = Date.now() - createdAt;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(createdAt).toLocaleDateString("pt-BR");
}
