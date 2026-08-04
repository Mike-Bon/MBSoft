import { NavLink, useLocation } from "react-router-dom";
import { Bike, PackagePlus, MapPin, LifeBuoy, Menu as MenuIcon } from "lucide-react";
import { classNames } from "../lib/utils";

const TABS = [
  { to: "/booking/on-demand", label: "On-Demand", icon: Bike },
  { to: "/booking/parcel", label: "Parcel & Cargo", icon: PackagePlus },
  { to: "/tracking", label: "Tracking", icon: MapPin },
  { to: "/support", label: "Support", icon: LifeBuoy },
];

const MENU_ROUTES = ["/dashboard", "/shipments", "/documentation", "/administration"];

export default function BottomNav({ onMenuClick, menuOpen }: { onMenuClick: () => void; menuOpen: boolean }) {
  const location = useLocation();
  const isMenuActive = menuOpen || MENU_ROUTES.some((r) => location.pathname.startsWith(r));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-lbc-border bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      {TABS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            classNames(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition",
              isActive ? "text-lbc-red" : "text-gray-500"
            )
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={onMenuClick}
        className={classNames(
          "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition",
          isMenuActive ? "text-lbc-red" : "text-gray-500"
        )}
      >
        <MenuIcon className="h-5 w-5" />
        Menu
      </button>
    </nav>
  );
}
