// @mention parsing shared by the composer (autocomplete trigger) and the
// renderer (turning "@handle" into a clickable link). Only a friend's own
// TAG can be mentioned — the candidate pool passed in is always the current
// user's friend list — so a mention always resolves to someone the author
// is actually connected to.

export interface MentionCandidate {
  uid: string;
  name: string;
  handle: string; // always "@"-prefixed, see normalizeHandle
  avatarUrl?: string;
}

export interface ResolvedMention {
  uid: string;
  handle: string; // "@"-prefixed
  name: string;
}

// "@" + 2-20 word chars, not preceded by a word char or "." — keeps this
// from matching inside emails ("user@example.com") or a partial URL
// segment right after a letter/digit. Emoji and punctuation around it never
// match the character class, so they never interfere.
export const MENTION_TOKEN_RE = /(?<![\w.])@([a-zA-Z0-9_]{2,20})/g;

// Resolves the @mentions actually present in `text` against `friends`,
// plus the special @todos token (only meaningful when there's at least one
// friend to notify — with none, @todos is inert and renders as plain text).
export function extractMentions(
  text: string,
  friends: MentionCandidate[]
): { mentions: ResolvedMention[]; mentionsAll: boolean } {
  const byHandle = new Map(friends.map((f) => [f.handle.slice(1).toLowerCase(), f]));
  const seenUids = new Set<string>();
  const mentions: ResolvedMention[] = [];
  let mentionsAll = false;

  const re = new RegExp(MENTION_TOKEN_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const token = match[1].toLowerCase();
    if (token === "todos") {
      mentionsAll = true;
      continue;
    }
    const friend = byHandle.get(token);
    if (friend && !seenUids.has(friend.uid)) {
      seenUids.add(friend.uid);
      mentions.push({ uid: friend.uid, handle: friend.handle, name: friend.name });
    }
  }

  if (friends.length === 0) mentionsAll = false;

  return { mentions, mentionsAll };
}

// "assistiu com X" / "assistiu com X e Y" / "assistiu com X, Y e mais N" /
// "todos os amigos" — shared by the feed card header and the pre-publish
// preview in ShareActivityModal, so both read the same wording.
export function formatWatchedWithLabel(mentions: ResolvedMention[], mentionsAll: boolean): string | null {
  if (mentionsAll) return "todos os amigos";
  if (mentions.length === 0) return null;
  const names = mentions.map((m) => m.name);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names[0]}, ${names[1]} e mais ${names.length - 2}`;
}
