import { Trash2 } from "lucide-react";
import AddressFields from "./AddressFields";
import type { Address, CargoType } from "../types";
import { formatCurrency, isValidMobile } from "../lib/utils";

export interface ConsigneeRowValue {
  key: string;
  name: string;
  address: Address;
  contactNumber: string;
  cargoType: CargoType;
  weightKg: number;
}

export function emptyConsigneeRow(key: string): ConsigneeRowValue {
  return {
    key,
    name: "",
    address: { province: "", city: "", barangay: "", street: "", houseNumber: "", landmark: "", instructions: "" },
    contactNumber: "",
    cargoType: "standard",
    weightKg: 1,
  };
}

export default function ConsigneeRow({
  index,
  value,
  onChange,
  onRemove,
  canRemove,
  charge,
  distanceKm,
}: {
  index: number;
  value: ConsigneeRowValue;
  onChange: (value: ConsigneeRowValue) => void;
  onRemove: () => void;
  canRemove: boolean;
  charge: number;
  distanceKm?: number;
}) {
  function set<K extends keyof ConsigneeRowValue>(key: K, val: ConsigneeRowValue[K]) {
    onChange({ ...value, [key]: val });
  }

  const contactTouched = value.contactNumber.length > 0;
  const contactInvalid = contactTouched && !isValidMobile(value.contactNumber);

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold text-gray-900">Consignee #{index + 1}</h3>
        {canRemove && (
          <button type="button" onClick={onRemove} className="btn-danger-outline">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Consignee Name</span>
          <input required className="input" value={value.name} onChange={(e) => set("name", e.target.value)} />
        </label>

        <AddressFields value={value.address} onChange={(address) => set("address", address)} showInstructions />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Contact Number</span>
            <input
              required
              className="input"
              placeholder="09XX XXX XXXX"
              value={value.contactNumber}
              onChange={(e) => set("contactNumber", e.target.value)}
            />
            {contactInvalid && <span className="mt-1 block text-xs text-red-500">Enter a valid PH mobile number.</span>}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Type of Cargo</span>
            <select
              className="input"
              value={value.cargoType}
              onChange={(e) => set("cargoType", e.target.value as CargoType)}
            >
              <option value="standard">Standard (Calculator)</option>
              <option value="on_demand_standard">On-Demand — Standard</option>
              <option value="on_demand_medical">On-Demand — Medical</option>
            </select>
          </label>
        </div>

        {value.cargoType === "standard" && (
          <label className="block max-w-xs">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Weight (kg)</span>
            <input
              type="number"
              min={0.1}
              step={0.1}
              className="input"
              value={value.weightKg}
              onChange={(e) => set("weightKg", Number(e.target.value))}
            />
          </label>
        )}

        <div className="flex items-center justify-between rounded-lg border border-lbc-border bg-lbc-bg px-4 py-3">
          <span className="text-sm text-gray-600">
            {value.cargoType === "standard" ? "Charge (Standard Calculator)" : "Charge (On-Demand Calculator)"}
            {distanceKm ? ` · ~${distanceKm} km` : ""}
          </span>
          <span className="text-lg font-bold text-lbc-red">{formatCurrency(charge)}</span>
        </div>
      </div>
    </div>
  );
}
