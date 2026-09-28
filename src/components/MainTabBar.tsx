import type { LucideIcon } from "lucide-react";
import { Compass, Home, ListVideo, User, Users } from "lucide-react";

export type AppTab = "programas" | "feed" | "amigos" | "explorar" | "perfil";

export const APP_TABS: { id: AppTab; label: string; icon: LucideIcon }[] = [
  { id: "programas", label: "Programas", icon: ListVideo },
  { id: "feed", label: "Feed", icon: Home },
  { id: "explorar", label: "Explorar", icon: Compass },
  { id: "amigos", label: "Amigos", icon: Users },
  { id: "perfil", label: "Perfil", icon: User },
];

interface MainTabBarProps {
  active: AppTab;
  onChange: (tab: AppTab) => void;
}

// Icon+label top bar only from lg up — below that (phones and tablets alike)
// MobileTabBar's icon-only bottom bar takes over, since 6 tabs with labels
// don't fit comfortably at tablet widths either.
export function DesktopTabBar({ active, onChange }: MainTabBarProps) {
  return (
    <nav className="hidden items-center gap-1 lg:flex">
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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-800 bg-stone-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {APP_TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-label={label}
              className={`flex items-center justify-center rounded-lg p-2.5 transition ${
                isActive ? "text-[#bd3347]" : "text-stone-500"
              }`}
            >
              <Icon size={22} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
