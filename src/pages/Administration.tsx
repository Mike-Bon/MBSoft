import { useMemo, useState } from "react";
import { LayoutGrid, Bike, Package, Percent, Calculator, ClipboardCheck, TrendingUp, Ruler, Stethoscope, Plus } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useData } from "../context/DataContext";
import { useConfig } from "../context/ConfigContext";
import { formatCurrency, classNames } from "../lib/utils";

type Tab = "dashboard" | "vehicles" | "products" | "pricing";

const TABS: { key: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "vehicles", label: "Vehicles", icon: Bike },
  { key: "products", label: "Product Types", icon: Package },
  { key: "pricing", label: "Pricing", icon: Percent },
];

export default function Administration() {
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <div>
      <PageHeader title="Administration" subtitle="Manage vehicles, product types and pricing configuration." />

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-lbc-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={classNames("tab-btn", tab === key ? "tab-btn-active" : "tab-btn-inactive")}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <AdminDashboardTab />}
      {tab === "vehicles" && <VehiclesTab />}
      {tab === "products" && <ProductTypesTab />}
      {tab === "pricing" && <PricingTab />}
    </div>
  );
}

function AdminDashboardTab() {
  const { bookings } = useData();

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todays = bookings.filter((b) => new Date(b.createdAt) >= today);
    const onDemand = todays.filter((b) => b.bookingType === "on_demand");
    const standard = todays.filter((b) => b.consignee.cargoType === "on_demand_standard");
    const medical = todays.filter((b) => b.consignee.cargoType === "on_demand_medical");
    const avgFare = todays.length ? todays.reduce((s, b) => s + b.charge, 0) / todays.length : 0;
    const distances = onDemand.map((b) => b.distanceKm).filter((d): d is number => typeof d === "number");
    const avgDistance = distances.length ? distances.reduce((s, d) => s + d, 0) / distances.length : null;
    return {
      calculations: onDemand.length,
      bookings: todays.length,
      avgFare,
      standard: standard.length,
      medical: medical.length,
      avgDistance,
    };
  }, [bookings]);

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-gray-900">Admin Dashboard</h2>
      <p className="mb-5 -mt-3 text-sm text-gray-500">Performance overview of the on-demand fare calculator.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Calculator} label="Today's Calculations" value={stats.calculations} iconClass="bg-red-50 text-lbc-red" />
        <StatCard icon={ClipboardCheck} label="Today's Bookings" value={stats.bookings} iconClass="bg-emerald-50 text-emerald-600" />
        <StatCard icon={TrendingUp} label="Average Fare" value={formatCurrency(stats.avgFare)} iconClass="bg-blue-50 text-blue-600" />
        <StatCard icon={Package} label="Standard Bookings" value={stats.standard} iconClass="bg-amber-50 text-amber-600" />
        <StatCard icon={Stethoscope} label="Medical Bookings" value={stats.medical} iconClass="bg-rose-50 text-rose-600" />
        <StatCard
          icon={Ruler}
          label="Average Distance"
          value={stats.avgDistance ? `${stats.avgDistance.toFixed(1)} km` : "—"}
          iconClass="bg-indigo-50 text-indigo-600"
        />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, iconClass }: { icon: typeof Calculator; label: string; value: string | number; iconClass: string }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-extrabold text-gray-900">{value}</p>
    </div>
  );
}

function VehiclesTab() {
  const { vehicles, addVehicle, toggleVehicle } = useConfig();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="space-y-5">
      <div className="card">
        <h3 className="mb-3 font-bold text-gray-900">Add Vehicle</h3>
        <div className="flex flex-wrap gap-3">
          <input className="input max-w-xs" placeholder="Vehicle name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input flex-1" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              if (!name) return;
              await addVehicle(name, description);
              setName("");
              setDescription("");
            }}
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-lbc-border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-lbc-bg text-xs uppercase text-gray-500">
            <tr>
              <th className="px-5 py-3">Vehicle</th>
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id} className="border-t border-lbc-border">
                <td className="px-5 py-3 font-semibold text-gray-900">{v.name}</td>
                <td className="px-5 py-3 text-gray-500">{v.description}</td>
                <td className="px-5 py-3 text-right">
                  <ToggleButton active={v.active} onClick={() => toggleVehicle(v.id, !v.active)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductTypesTab() {
  const { productTypes, addProductType, toggleProductType } = useConfig();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="space-y-5">
      <div className="card">
        <h3 className="mb-3 font-bold text-gray-900">Add Product Type</h3>
        <div className="flex flex-wrap gap-3">
          <input className="input max-w-xs" placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input flex-1" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              if (!name) return;
              await addProductType(name, description);
              setName("");
              setDescription("");
            }}
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-lbc-border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-lbc-bg text-xs uppercase text-gray-500">
            <tr>
              <th className="px-5 py-3">Product Type</th>
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {productTypes.map((p) => (
              <tr key={p.id} className="border-t border-lbc-border">
                <td className="px-5 py-3 font-semibold text-gray-900">{p.name}</td>
                <td className="px-5 py-3 text-gray-500">{p.description}</td>
                <td className="px-5 py-3 text-right">
                  <ToggleButton active={p.active} onClick={() => toggleProductType(p.id, !p.active)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PricingTab() {
  const { pricing, updatePricing } = useConfig();
  const [drafts, setDrafts] = useState<Record<string, { baseFare: number; perKm: number; minFare: number }>>({});

  function draftFor(id: string) {
    const found = pricing.find((p) => p.id === id)!;
    return drafts[id] || { baseFare: found.baseFare, perKm: found.perKm, minFare: found.minFare };
  }

  return (
    <div className="space-y-5">
      {pricing.map((p) => {
        const draft = draftFor(p.id);
        return (
          <div key={p.id} className="card">
            <h3 className="mb-4 font-bold capitalize text-gray-900">{p.productType} Rate Card</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <NumberField
                label="Base Fare (₱)"
                value={draft.baseFare}
                onChange={(v) => setDrafts((d) => ({ ...d, [p.id]: { ...draft, baseFare: v } }))}
              />
              <NumberField
                label="Per KM (₱)"
                value={draft.perKm}
                onChange={(v) => setDrafts((d) => ({ ...d, [p.id]: { ...draft, perKm: v } }))}
              />
              <NumberField
                label="Minimum Fare (₱)"
                value={draft.minFare}
                onChange={(v) => setDrafts((d) => ({ ...d, [p.id]: { ...draft, minFare: v } }))}
              />
            </div>
            <button
              type="button"
              className="btn-primary mt-4"
              onClick={() => updatePricing(p.id, draft)}
            >
              Save {p.productType} Pricing
            </button>
          </div>
        );
      })}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      <input type="number" min={0} step={1} className="input" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function ToggleButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "rounded-full px-3 py-1 text-xs font-semibold",
        active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
      )}
    >
      {active ? "Active" : "Inactive"}
    </button>
  );
}
