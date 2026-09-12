import { Bookmark, Clock, Eye } from "lucide-react";
import type { MediaStatus } from "../types";
import { MEDIA_STATUSES } from "../types";

interface StatusTabsProps {
  active: MediaStatus;
  onChange: (status: MediaStatus) => void;
  counts: Record<MediaStatus, number>;
}

const ICONS: Record<MediaStatus, React.ComponentType<{ size?: number }>> = {
  "Quero Ver": Bookmark,
  Assistindo: Clock,
  Visto: Eye,
};

export function StatusTabs({ active, onChange, counts }: StatusTabsProps) {
  return (
    <div className="relative">
      <div className="no-scrollbar flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-stone-800 bg-stone-900/60 p-1">
        {MEDIA_STATUSES.map((status) => {
          const Icon = ICONS[status];
          const isActive = status === active;
          return (
            <button
              key={status}
              onClick={() => onChange(status)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition sm:gap-2 sm:px-4 ${
                isActive
                  ? "bg-[#a32638] text-white shadow-sm"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              <Icon size={15} />
              {status}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  isActive ? "bg-white/20" : "bg-stone-800"
                }`}
              >
                {counts[status]}
              </span>
            </button>
          );
        })}
      </div>
      {/* Hints there's more to scroll on narrow screens, where the 3 tabs
          rarely all fit — desktop's w-fit container never needs it. */}
      <div className="pointer-events-none absolute inset-y-1 right-0 w-8 rounded-r-xl bg-linear-to-l from-stone-900 to-transparent sm:hidden" />
    </div>
  );
}
