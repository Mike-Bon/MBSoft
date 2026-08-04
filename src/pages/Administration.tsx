import { useMemo, useState } from "react";
import {
  LayoutGrid,
  Bike,
  Package,
  Calculator,
  ClipboardCheck,
  TrendingUp,
  Ruler,
  Stethoscope,
  Plus,
  ChevronDown,
  ChevronUp,
  MapPin,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useData } from "../context/DataContext";
import { useConfig } from "../context/ConfigContext";
import { formatCurrency, classNames } from "../lib/utils";
import type { Vehicle } from "../types";

type Tab = "dashboard" | "vehicles" | "products";

const TABS: { key: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "vehicles", label: "Vehicles", icon: Bike },
  { key: "products", label: "Product Types", icon: Package },
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
    </div>
  );
}

function AdminDashboardTab() {
  const { bookings } = useData();

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todays = bookings.filter((b) => new Date(b.createdAt) >= today);
    const onDemandToday = todays.filter((b) => b.bookingType === "on_demand");
    const standard = todays.filter((b) => b.consignee.cargoType === "on_demand_standard");
    const medical = todays.filter((b) => b.consignee.cargoType === "on_demand_medical");
    const avgFare = todays.length ? todays.reduce((s, b) => s + b.charge, 0) / todays.length : 0;
    const distancesToday = onDemandToday.map((b) => b.distanceKm).filter((d): d is number => typeof d === "number");
    const avgDistance = distancesToday.length ? distancesToday.reduce((s, d) => s + d, 0) / distancesToday.length : null;

    const allOnDemand = bookings.filter((b) => b.bookingType === "on_demand");
    const routeCounts = new Map<string, number>();
    for (const b of allOnDemand) {
      if (!b.pickupAddress || !b.dropoffAddress) continue;
      const key = `${b.pickupAddress} → ${b.dropoffAddress}`;
      routeCounts.set(key, (routeCounts.get(key) || 0) + 1);
    }
    let mostUsedRoute: string | null = null;
    let mostUsedCount = 0;
    for (const [route, count] of routeCounts) {
      if (count > mostUsedCount) {
        mostUsedRoute = route;
        mostUsedCount = count;
      }
    }

    const farePerKm = allOnDemand
      .filter((b): b is typeof b & { distanceKm: number } => typeof b.distanceKm === "number" && b.distanceKm > 0)
      .map((b) => b.charge / b.distanceKm!);
    const avgFarePerKm = farePerKm.length ? farePerKm.reduce((s, v) => s + v, 0) / farePerKm.length : null;

    return {
      calculations: onDemandToday.length,
      bookings: todays.length,
      avgFare,
      standard: standard.length,
      medical: medical.length,
      avgDistance,
      mostUsedRoute,
      mostUsedCount,
      avgFarePerKm,
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
        <StatCard
          icon={TrendingUp}
          label="Average Fare Per Kilometer"
          value={stats.avgFarePerKm ? formatCurrency(stats.avgFarePerKm) : "—"}
          iconClass="bg-purple-50 text-purple-600"
        />
        <div className="card sm:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Most Used Route</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
              <MapPin className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 truncate text-lg font-bold text-gray-900" title={stats.mostUsedRoute || undefined}>
            {stats.mostUsedRoute || "—"}
          </p>
          {stats.mostUsedRoute && <p className="mt-1 text-xs text-gray-400">{stats.mostUsedCount} bookings</p>}
        </div>
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

type VehicleDraft = Pick<
  Vehicle,
  | "baseFare"
  | "includedKm"
  | "rateFirstKm"
  | "rateAfterIncluded"
  | "timeRate"
  | "trafficMultiplier"
  | "demandMultiplier"
  | "zoneMultiplier"
  | "platformMargin"
> & { maxWeightKg: string; maxDimensions: string };

function draftFromVehicle(v: Vehicle): VehicleDraft {
  return {
    baseFare: v.baseFare,
    includedKm: v.includedKm,
    rateFirstKm: v.rateFirstKm,
    rateAfterIncluded: v.rateAfterIncluded,
    timeRate: v.timeRate,
    trafficMultiplier: v.trafficMultiplier,
    demandMultiplier: v.demandMultiplier,
    zoneMultiplier: v.zoneMultiplier,
    platformMargin: v.platformMargin,
    maxWeightKg: v.maxWeightKg != null ? String(v.maxWeightKg) : "",
    maxDimensions: v.maxDimensions || "",
  };
}

function VehiclesTab() {
  const { vehicles, addVehicle, updateVehicle } = useConfig();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, VehicleDraft>>({});

  function draftFor(v: Vehicle): VehicleDraft {
    return drafts[v.id] || draftFromVehicle(v);
  }

  function setDraftField<K extends keyof VehicleDraft>(v: Vehicle, key: K, value: VehicleDraft[K]) {
    setDrafts((prev) => ({ ...prev, [v.id]: { ...draftFor(v), [key]: value } }));
  }

  async function saveRates(v: Vehicle) {
    const draft = draftFor(v);
    await updateVehicle(v.id, {
      baseFare: draft.baseFare,
      includedKm: draft.includedKm,
      rateFirstKm: draft.rateFirstKm,
      rateAfterIncluded: draft.rateAfterIncluded,
      timeRate: draft.timeRate,
      trafficMultiplier: draft.trafficMultiplier,
      demandMultiplier: draft.demandMultiplier,
      zoneMultiplier: draft.zoneMultiplier,
      platformMargin: draft.platformMargin,
      maxWeightKg: draft.maxWeightKg ? Number(draft.maxWeightKg) : undefined,
      maxDimensions: draft.maxDimensions || undefined,
    });
  }

  return (
    <div className="space-y-5">
      <div className="card">
        <h3 className="mb-3 font-bold text-gray-900">Add Vehicle</h3>
        <p className="mb-3 text-sm text-gray-500">
          New vehicles start hidden from customers (Visible = off) with default rates — enable Visible once its rate
          card is configured. No redeployment needed.
        </p>
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

      <div className="space-y-3">
        {vehicles.map((v) => {
          const isOpen = expanded === v.id;
          const draft = draftFor(v);
          return (
            <div key={v.id} className="overflow-hidden rounded-2xl border border-lbc-border bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-semibold text-gray-900">{v.name}</p>
                  <p className="text-sm text-gray-500">{v.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <ToggleButton
                    label="Active"
                    active={v.active}
                    onClick={() => updateVehicle(v.id, { active: !v.active })}
                  />
                  <ToggleButton
                    label="Visible"
                    active={v.visible}
                    onClick={() => updateVehicle(v.id, { visible: !v.visible })}
                  />
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : v.id)}
                    className="btn-secondary !px-3 !py-1.5 text-xs"
                  >
                    Edit Rates
                    {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-lbc-border bg-lbc-bg px-5 py-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    <NumberField label="Base Fare (₱)" value={draft.baseFare} onChange={(x) => setDraftField(v, "baseFare", x)} />
                    <NumberField label="Included Distance (km)" value={draft.includedKm} onChange={(x) => setDraftField(v, "includedKm", x)} />
                    <NumberField label="Rate First KM (₱)" value={draft.rateFirstKm} onChange={(x) => setDraftField(v, "rateFirstKm", x)} />
                    <NumberField
                      label="Rate After Included (₱/km)"
                      value={draft.rateAfterIncluded}
                      onChange={(x) => setDraftField(v, "rateAfterIncluded", x)}
                    />
                    <NumberField label="Time Rate (₱/min)" value={draft.timeRate} onChange={(x) => setDraftField(v, "timeRate", x)} step={0.1} />
                    <NumberField
                      label="Traffic Multiplier"
                      value={draft.trafficMultiplier}
                      onChange={(x) => setDraftField(v, "trafficMultiplier", x)}
                      step={0.05}
                    />
                    <NumberField
                      label="Demand Multiplier"
                      value={draft.demandMultiplier}
                      onChange={(x) => setDraftField(v, "demandMultiplier", x)}
                      step={0.05}
                    />
                    <NumberField
                      label="Zone Multiplier"
                      value={draft.zoneMultiplier}
                      onChange={(x) => setDraftField(v, "zoneMultiplier", x)}
                      step={0.05}
                    />
                    <NumberField
                      label="Platform Margin (₱)"
                      value={draft.platformMargin}
                      onChange={(x) => setDraftField(v, "platformMargin", x)}
                    />
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-gray-700">Maximum Weight (kg)</span>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        value={draft.maxWeightKg}
                        onChange={(e) => setDraftField(v, "maxWeightKg", e.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-gray-700">Maximum Dimensions</span>
                      <input
                        className="input"
                        placeholder='e.g. 40 x 30 x 30 cm'
                        value={draft.maxDimensions}
                        onChange={(e) => setDraftField(v, "maxDimensions", e.target.value)}
                      />
                    </label>
                  </div>
                  <button type="button" onClick={() => saveRates(v)} className="btn-primary mt-4">
                    Save {v.name} Rates
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductTypesTab() {
  const { productTypes, addProductType, updateProductType } = useConfig();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [multiplier, setMultiplier] = useState(1);
  const [drafts, setDrafts] = useState<Record<string, number>>({});

  return (
    <div className="space-y-5">
      <div className="card">
        <h3 className="mb-3 font-bold text-gray-900">Add Product Type</h3>
        <div className="flex flex-wrap gap-3">
          <input className="input max-w-xs" placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input flex-1" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <input
            type="number"
            step={0.05}
            min={0.01}
            className="input max-w-[140px]"
            placeholder="Multiplier"
            value={multiplier}
            onChange={(e) => setMultiplier(Number(e.target.value))}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              if (!name) return;
              await addProductType(name, description, multiplier);
              setName("");
              setDescription("");
              setMultiplier(1);
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
              <th className="px-5 py-3">Multiplier</th>
              <th className="px-5 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {productTypes.map((p) => (
              <tr key={p.id} className="border-t border-lbc-border">
                <td className="px-5 py-3 font-semibold text-gray-900">{p.name}</td>
                <td className="px-5 py-3 text-gray-500">{p.description}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={0.05}
                      min={0.01}
                      className="input max-w-[100px] !py-1.5"
                      value={drafts[p.id] ?? p.multiplier}
                      onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: Number(e.target.value) }))}
                    />
                    <button
                      type="button"
                      className="btn-secondary !px-2.5 !py-1.5 text-xs"
                      onClick={() => updateProductType(p.id, { multiplier: drafts[p.id] ?? p.multiplier })}
                    >
                      Save
                    </button>
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  <ToggleButton active={p.active} onClick={() => updateProductType(p.id, { active: !p.active })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      <input type="number" min={0} step={step} className="input" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function ToggleButton({ label, active, onClick }: { label?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "rounded-full px-3 py-1 text-xs font-semibold",
        active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
      )}
    >
      {label ? `${label}: ${active ? "On" : "Off"}` : active ? "Active" : "Inactive"}
    </button>
  );
}
