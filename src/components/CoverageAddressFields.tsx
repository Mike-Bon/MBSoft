import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { Address } from "../types";
import { loadCoverage, getCoverageCities, getCoverageBarangays, getCoverageZone, type CoverageData } from "../lib/coverage";
import type { CoverageZone } from "../lib/parcelPricingEngine";

/** Same shape as AddressFields, but Province/City/Barangay are cascading selects
 * sourced from LBC's real coverage dataset (not free text) — needed so the exact
 * barangay picked resolves reliably to a real rate bucket / serviceability zone.
 * Used only where that matters (Parcel & Cargo Booking's consignee address);
 * Registration and other flows keep the simpler free-text-friendly AddressFields. */
export default function CoverageAddressFields({
  value,
  onChange,
  onZoneResolved,
  showInstructions,
}: {
  value: Address;
  onChange: (address: Address) => void;
  onZoneResolved?: (zone: CoverageZone | undefined) => void;
  showInstructions?: boolean;
}) {
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCoverage()
      .then((data) => {
        if (!cancelled) setCoverage(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load service area data. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const provinces = coverage ? Object.keys(coverage).sort() : [];
  const cities = coverage && value.province ? getCoverageCities(coverage, value.province) : [];
  const barangays = coverage && value.province && value.city ? getCoverageBarangays(coverage, value.province, value.city) : [];
  const zone =
    coverage && value.province && value.city && value.barangay
      ? getCoverageZone(coverage, value.province, value.city, value.barangay)
      : undefined;

  useEffect(() => {
    onZoneResolved?.(zone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone]);

  function set<K extends keyof Address>(key: K, val: Address[K]) {
    onChange({ ...value, [key]: val });
  }

  if (error) {
    return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  }

  if (!coverage) {
    return (
      <div className="input flex items-center gap-2 text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading service area data…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Province">
        <select
          className="input"
          value={value.province}
          onChange={(e) => onChange({ ...value, province: e.target.value, city: "", barangay: "" })}
        >
          <option value="">Select</option>
          {provinces.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>

      <Field label="City / Municipality">
        <select
          className="input"
          value={value.city}
          disabled={!value.province}
          onChange={(e) => onChange({ ...value, city: e.target.value, barangay: "" })}
        >
          <option value="">Select</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Barangay">
        <select className="input" value={value.barangay} disabled={!value.city} onChange={(e) => set("barangay", e.target.value)}>
          <option value="">Select</option>
          {barangays.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Street">
        <input className="input" value={value.street} onChange={(e) => set("street", e.target.value)} />
      </Field>

      <Field label="House Number">
        <input className="input" value={value.houseNumber} onChange={(e) => set("houseNumber", e.target.value)} />
      </Field>

      <Field label="Landmark (optional)">
        <input className="input" value={value.landmark || ""} onChange={(e) => set("landmark", e.target.value)} />
      </Field>

      {showInstructions && (
        <div className="sm:col-span-2">
          <Field label="Other Instructions (optional)">
            <textarea
              className="input"
              rows={2}
              value={value.instructions || ""}
              onChange={(e) => set("instructions", e.target.value)}
            />
          </Field>
        </div>
      )}

      {zone && zone !== "S" && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 sm:col-span-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {zone === "O"
            ? "This barangay is outside our regular delivery zone (ODZ) for standard parcel booking."
            : "This barangay is not currently serviceable for standard parcel booking."}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
