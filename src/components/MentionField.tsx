import { Users, User as UserIcon } from "lucide-react";
import { useMentionAutocomplete } from "../hooks/useMentionAutocomplete";
import type { MentionCandidate } from "../utils/mentions";

interface MentionFieldProps {
  value: string;
  onChange: (value: string) => void;
  candidates: MentionCandidate[];
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  className: string;
  autoFocus?: boolean;
}

// A plain textarea/input that detects "@" while typing and shows a
// friends-only autocomplete dropdown (plus "@todos" when there's at least
// one friend to mention). Used by the post composer, post edit, comment
// composer and comment edit — anywhere mention text is authored.
export function MentionField({
  value,
  onChange,
  candidates,
  multiline = false,
  rows = 3,
  placeholder,
  className,
  autoFocus,
}: MentionFieldProps) {
  const { fieldRef, open, items, activeIndex, handleChangeEvent, handleKeyDown, select, close } = useMentionAutocomplete(
    value,
    onChange,
    candidates
  );

  const shared = {
    value,
    placeholder,
    autoFocus,
    className,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      onChange(e.target.value);
      handleChangeEvent(e.target);
    },
    onSelect: (e: React.SyntheticEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      handleChangeEvent(e.currentTarget);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      handleKeyDown(e);
    },
    // A suggestion click uses onMouseDown+preventDefault so it never blurs
    // the field in the first place; this timeout is just a safety net for
    // input paths where that doesn't hold (e.g. some touch browsers).
    onBlur: () => {
      window.setTimeout(close, 120);
    },
  };

  return (
    <div className="relative flex-1">
      {multiline ? (
        <textarea ref={fieldRef as React.RefObject<HTMLTextAreaElement>} rows={rows} {...shared} />
      ) : (
        <input ref={fieldRef as React.RefObject<HTMLInputElement>} {...shared} />
      )}

      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-stone-800 bg-stone-900 p-1 shadow-2xl shadow-black/50">
          {items.map((item, i) => {
            const active = i === activeIndex;
            if (item.kind === "todos") {
              return (
                <button
                  key="todos"
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(item)}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-semibold text-[#bd3347] ${
                    active ? "bg-stone-800" : "hover:bg-stone-800/60"
                  }`}
                >
                  <Users size={13} /> @todos
                  <span className="font-normal text-stone-500">— mencionar todos os amigos</span>
                </button>
              );
            }
            const c = item.candidate;
            return (
              <button
                key={c.uid}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(item)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left ${
                  active ? "bg-stone-800" : "hover:bg-stone-800/60"
                }`}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-800 bg-stone-950">
                  {c.avatarUrl ? (
                    <img src={c.avatarUrl} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon size={11} className="text-stone-600" />
                  )}
                </div>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-white">{c.name}</span>
                  <span className="block truncate text-[10px] text-stone-500">{c.handle}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
