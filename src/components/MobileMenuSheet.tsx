import { NavLink } from "react-router-dom";
import { LayoutGrid, ListChecks, FileText, Settings, LogOut, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { classNames } from "../lib/utils";

const MENU_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/shipments", label: "Shipments", icon: ListChecks },
  { to: "/documentation", label: "Documentation", icon: FileText },
  { to: "/administration", label: "Administration", icon: Settings },
];

export default function MobileMenuSheet({ onClose }: { onClose: () => void }) {
  const { profile, signOut } = useAuth();

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 lg:hidden" onClick={onClose}>
      <div
        className="w-full rounded-t-2xl bg-white pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-lbc-border px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">Menu</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-lbc-bg hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {MENU_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                classNames(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition",
                  isActive ? "bg-lbc-red text-white shadow-sm" : "text-gray-700 hover:bg-lbc-red-light"
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {profile && (
          <div className="mx-3 mb-3 rounded-lg bg-lbc-bg px-3 py-2">
            <p className="truncate text-sm font-semibold text-gray-900">{profile.name}</p>
            <p className="truncate text-xs text-gray-500">{profile.email}</p>
          </div>
        )}

        <div className="border-t border-lbc-border p-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              signOut();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
