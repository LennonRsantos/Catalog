import type { LucideIcon } from "lucide-react";
import { BarChart3, Compass, ListVideo, Rss, Users } from "lucide-react";

export type AppTab = "programas" | "feed" | "amigos" | "explorar" | "dashboard";

export const APP_TABS: { id: AppTab; label: string; icon: LucideIcon }[] = [
  { id: "programas", label: "Programas", icon: ListVideo },
  { id: "feed", label: "Feed", icon: Rss },
  { id: "amigos", label: "Amigos", icon: Users },
  { id: "explorar", label: "Explorar", icon: Compass },
  { id: "dashboard", label: "Estatísticas", icon: BarChart3 },
];

interface MainTabBarProps {
  active: AppTab;
  onChange: (tab: AppTab) => void;
}

export function DesktopTabBar({ active, onChange }: MainTabBarProps) {
  return (
    <nav className="hidden items-center gap-1 sm:flex">
      {APP_TABS.map(({ id, label, icon: Icon }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive ? "bg-[#a32638] text-white" : "text-stone-400 hover:bg-stone-900 hover:text-white"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}

export function MobileTabBar({ active, onChange }: MainTabBarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-800 bg-stone-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {APP_TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-medium transition ${
                isActive ? "text-[#bd3347]" : "text-stone-500"
              }`}
            >
              <Icon size={20} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
