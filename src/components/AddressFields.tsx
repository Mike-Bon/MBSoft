import type { Address } from "../types";
import { PH_PROVINCE_LIST, PH_PROVINCES } from "../data/philippines";

export default function AddressFields({
  value,
  onChange,
  showInstructions,
}: {
  value: Address;
  onChange: (address: Address) => void;
  showInstructions?: boolean;
}) {
  const cityOptions = PH_PROVINCES[value.province] || [];

  function set<K extends keyof Address>(key: K, val: Address[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Province">
        <select
          className="input"
          value={value.province}
          onChange={(e) => onChange({ ...value, province: e.target.value, city: "" })}
        >
          <option value="">Select</option>
          {PH_PROVINCE_LIST.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>

      <Field label="City / Municipality">
        {cityOptions.length > 0 ? (
          <select className="input" value={value.city} onChange={(e) => set("city", e.target.value)}>
            <option value="">Select</option>
            {cityOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="input"
            placeholder="City / Municipality"
            value={value.city}
            onChange={(e) => set("city", e.target.value)}
          />
        )}
      </Field>

      <Field label="Barangay">
        <input className="input" value={value.barangay} onChange={(e) => set("barangay", e.target.value)} />
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
