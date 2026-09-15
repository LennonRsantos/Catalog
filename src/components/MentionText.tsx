import { useMemo } from "react";
import type { ResolvedMention } from "../utils/mentions";
import { MENTION_TOKEN_RE } from "../utils/mentions";

interface MentionTextProps {
  text: string;
  mentions?: ResolvedMention[];
  mentionsAll?: boolean;
  onOpenProfile: (uid: string) => void;
}

// Renders post/comment text, turning "@handle" into a link to that person's
// profile — but only for handles present in `mentions` (resolved and stored
// at write time by the author's own client). Any other "@word" — a
// coincidental hashtag-style tag, part of an email, a stray "@" — is left
// as plain text, since it never matched a real mention to begin with.
export function MentionText({ text, mentions = [], mentionsAll = false, onOpenProfile }: MentionTextProps) {
  const byHandle = useMemo(() => {
    const map = new Map<string, ResolvedMention>();
    for (const m of mentions) map.set(m.handle.replace(/^@/, "").toLowerCase(), m);
    return map;
  }, [mentions]);

  const nodes = useMemo(() => {
    const parts: React.ReactNode[] = [];
    const re = new RegExp(MENTION_TOKEN_RE.source, "g");
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    while ((match = re.exec(text))) {
      const [full, word] = match;
      const start = match.index;
      if (start > lastIndex) parts.push(text.slice(lastIndex, start));

      const lower = word.toLowerCase();
      if (lower === "todos" && mentionsAll) {
        parts.push(
          <span key={key++} className="font-semibold text-[#bd3347]">
            @todos
          </span>
        );
      } else if (byHandle.has(lower)) {
        const target = byHandle.get(lower)!;
        parts.push(
          <button
            key={key++}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenProfile(target.uid);
            }}
            className="font-semibold text-[#bd3347] hover:underline"
          >
            @{word}
          </button>
        );
      } else {
        parts.push(full);
      }

      lastIndex = start + full.length;
    }

    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts;
  }, [text, byHandle, mentionsAll, onOpenProfile]);

  return <>{nodes}</>;
}
