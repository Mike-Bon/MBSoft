import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutGrid,
  PackagePlus,
  Bike,
  ListChecks,
  MapPin,
  FileText,
  LifeBuoy,
  Settings,
  LogOut,
  Truck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { classNames } from "../lib/utils";
import BottomNav from "./BottomNav";
import MobileMenuSheet from "./MobileMenuSheet";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/booking/parcel", label: "Parcel & Cargo Booking", icon: PackagePlus },
  { to: "/booking/on-demand", label: "On-Demand Booking", icon: Bike },
  { to: "/shipments", label: "Shipments", icon: ListChecks },
  { to: "/tracking", label: "Tracking", icon: MapPin },
  { to: "/documentation", label: "Documentation", icon: FileText },
  { to: "/support", label: "Support", icon: LifeBuoy },
];

export default function Layout() {
  const { signOut, profile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-lbc-bg">
      <header className="flex h-16 shrink-0 items-center justify-between bg-lbc-red px-4 shadow-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 sm:h-10 sm:w-10">
            <Truck className="h-5 w-5 text-white sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-base font-extrabold text-white sm:text-lg">LBC Express</p>
            <p className="hidden text-[11px] font-semibold tracking-wider text-white/80 sm:block">BOOKING PORTAL</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="hidden rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white sm:inline-flex">
            Philippines
          </span>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-lbc-red transition hover:bg-lbc-red-light sm:px-4"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-lbc-border bg-white lg:flex">
          <nav className="flex flex-col gap-1 p-3">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
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
          <div className="border-t border-lbc-border p-3">
            <NavLink
              to="/administration"
              className={({ isActive }) =>
                classNames(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition",
                  isActive ? "bg-lbc-red text-white shadow-sm" : "text-gray-700 hover:bg-lbc-red-light"
                )
              }
            >
              <Settings className="h-5 w-5 shrink-0" />
              Administration
            </NavLink>
            {profile && (
              <div className="mt-3 rounded-lg bg-lbc-bg px-3 py-2">
                <p className="truncate text-sm font-semibold text-gray-900">{profile.name}</p>
                <p className="truncate text-xs text-gray-500">{profile.email}</p>
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav onMenuClick={() => setMenuOpen(true)} menuOpen={menuOpen} />
      {menuOpen && <MobileMenuSheet onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
