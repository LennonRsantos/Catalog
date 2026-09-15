import { useMemo, useRef, useState } from "react";
import type { MentionCandidate } from "../utils/mentions";

export type MentionListItem = { kind: "todos" } | { kind: "friend"; candidate: MentionCandidate };

type MentionField = HTMLTextAreaElement | HTMLInputElement;

// Matches an in-progress "@word" right at the cursor, only when it starts a
// token (start-of-text or preceded by whitespace) — the same boundary rule
// as MENTION_TOKEN_RE, so what triggers the dropdown is exactly what
// extractMentions/MentionText will later recognize as a mention.
const TRIGGER_RE = /(?:^|\s)@([a-zA-Z0-9_]{0,20})$/;

const MAX_SUGGESTIONS = 8;

// Drives the "@" trigger-detection + suggestion list for a single text
// field. The field itself (textarea or input) is agnostic — MentionField
// wires this hook to whichever element it renders.
export function useMentionAutocomplete(
  value: string,
  onChange: (next: string) => void,
  candidates: MentionCandidate[]
) {
  const fieldRef = useRef<MentionField | null>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [triggerStart, setTriggerStart] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo<MentionListItem[]>(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    const list: MentionListItem[] = [];
    if (candidates.length > 0 && "todos".startsWith(q)) list.push({ kind: "todos" });
    for (const c of candidates) {
      if (list.length >= MAX_SUGGESTIONS) break;
      const handleBody = c.handle.slice(1).toLowerCase();
      if (handleBody.startsWith(q) || c.name.toLowerCase().startsWith(q)) {
        list.push({ kind: "friend", candidate: c });
      }
    }
    return list.slice(0, MAX_SUGGESTIONS);
  }, [query, candidates]);

  const open = query !== null && items.length > 0;

  function handleChangeEvent(el: MentionField) {
    const pos = el.selectionStart ?? el.value.length;
    const upToCursor = el.value.slice(0, pos);
    const match = TRIGGER_RE.exec(upToCursor);
    if (match) {
      setQuery(match[1]);
      setTriggerStart(pos - match[1].length - 1);
      setActiveIndex(0);
    } else {
      setQuery(null);
    }
  }

  function select(item: MentionListItem) {
    if (query === null) return;
    const handleText = item.kind === "todos" ? "@todos" : item.candidate.handle;
    const before = value.slice(0, triggerStart);
    const after = value.slice(triggerStart + 1 + query.length);
    const next = `${before}${handleText} ${after}`;
    onChange(next);
    setQuery(null);

    const cursor = (before + handleText + " ").length;
    requestAnimationFrame(() => {
      const el = fieldRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  }

  function close() {
    setQuery(null);
  }

  // Returns true when it handled the key (caller should not do anything else).
  function handleKeyDown(e: React.KeyboardEvent): boolean {
    if (!open) return false;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      select(items[activeIndex]);
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return true;
    }
    return false;
  }

  return { fieldRef, open, items, activeIndex, handleChangeEvent, handleKeyDown, select, close };
}
