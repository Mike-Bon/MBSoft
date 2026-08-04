import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import CoverageAddressFields from "./CoverageAddressFields";
import { computeParcelFare, type CoverageZone } from "../lib/parcelPricingEngine";
import { DOC_KEYS, PRODUCT_LABEL, type ParcelProductKey } from "../data/lbcConstants";
import type { Address } from "../types";
import { formatCurrency, isValidMobile } from "../lib/utils";

export interface ConsigneeRowValue {
  key: string;
  name: string;
  address: Address;
  contactNumber: string;
  product: ParcelProductKey;
  weightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  declaredValue: string;
}

export function emptyConsigneeRow(key: string): ConsigneeRowValue {
  return {
    key,
    name: "",
    address: { province: "", city: "", barangay: "", street: "", houseNumber: "", landmark: "", instructions: "" },
    contactNumber: "",
    product: "np_reg",
    weightKg: "",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    declaredValue: "",
  };
}

const PRODUCT_OPTIONS: ParcelProductKey[] = [
  "np_reg",
  "np_xl",
  "np_ss",
  "vpouch",
  "np_small",
  "np_medium",
  "np_large",
  "kb_mini",
  "kb_small",
  "kb_slim",
  "kb_medium",
  "kb_large",
  "kb_xl",
  "gen_cargo",
];

export interface StandardFareResult {
  charge: number;
  serviceable: boolean;
}

export default function ConsigneeRow({
  index,
  value,
  onChange,
  onRemove,
  canRemove,
  originProvince,
  originCity,
  onStandardResult,
}: {
  index: number;
  value: ConsigneeRowValue;
  onChange: (value: ConsigneeRowValue) => void;
  onRemove: () => void;
  canRemove: boolean;
  originProvince: string;
  originCity: string;
  onStandardResult: (result: StandardFareResult) => void;
}) {
  const [zone, setZone] = useState<CoverageZone | undefined>(undefined);

  function set<K extends keyof ConsigneeRowValue>(key: K, val: ConsigneeRowValue[K]) {
    onChange({ ...value, [key]: val });
  }

  const contactTouched = value.contactNumber.length > 0;
  const contactInvalid = contactTouched && !isValidMobile(value.contactNumber);

  const isGenCargo = value.product === "gen_cargo";
  const isDocProduct = DOC_KEYS.has(value.product);

  const declaredValueNum = value.declaredValue ? Number(value.declaredValue) : undefined;
  const declaredValueInvalid = declaredValueNum != null && (declaredValueNum < 500 || declaredValueNum > 100000);

  const standardResult = useMemo(() => {
    if (!value.address.province || !value.address.city || !value.address.barangay) return null;
    if (!zone) return null;
    if (declaredValueInvalid) {
      return { serviceable: false, blockReason: "Declared value must be between ₱500 and ₱100,000, or left blank.", finalFare: 0 };
    }
    return computeParcelFare({
      product: value.product,
      originProvince,
      originCity,
      destProvince: value.address.province,
      destCity: value.address.city,
      destBarangay: value.address.barangay,
      destZone: zone,
      weightKg: value.weightKg ? Number(value.weightKg) : undefined,
      lengthCm: value.lengthCm ? Number(value.lengthCm) : undefined,
      widthCm: value.widthCm ? Number(value.widthCm) : undefined,
      heightCm: value.heightCm ? Number(value.heightCm) : undefined,
      declaredValue: isDocProduct ? undefined : declaredValueNum,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    value.product,
    value.address.province,
    value.address.city,
    value.address.barangay,
    zone,
    value.weightKg,
    value.lengthCm,
    value.widthCm,
    value.heightCm,
    declaredValueNum,
    declaredValueInvalid,
    isDocProduct,
    originProvince,
    originCity,
  ]);

  useEffect(() => {
    onStandardResult({ charge: standardResult?.finalFare ?? 0, serviceable: standardResult?.serviceable ?? false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standardResult]);

  const displayCharge = standardResult?.finalFare ?? 0;

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

        <CoverageAddressFields
          value={value.address}
          onChange={(address) => set("address", address)}
          onZoneResolved={setZone}
          showInstructions
        />

        <label className="block max-w-xs">
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
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Product</span>
          <select className="input" value={value.product} onChange={(e) => set("product", e.target.value as ParcelProductKey)}>
            {PRODUCT_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {PRODUCT_LABEL[p]}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Weight (kg){isGenCargo ? "" : " (optional)"}</span>
            <input
              type="number"
              min={0.1}
              step={0.1}
              className="input"
              value={value.weightKg}
              onChange={(e) => set("weightKg", e.target.value)}
            />
          </label>
          {!isDocProduct && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Declared Value (₱, optional)</span>
              <input
                type="number"
                min={0}
                step={1}
                className="input"
                placeholder="500 - 100,000"
                value={value.declaredValue}
                onChange={(e) => set("declaredValue", e.target.value)}
              />
              {declaredValueInvalid && <span className="mt-1 block text-xs text-red-500">Must be between ₱500 and ₱100,000.</span>}
            </label>
          )}
        </div>

        {isGenCargo && (
          <div className="grid grid-cols-3 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Length (cm)</span>
              <input type="number" min={0} className="input" value={value.lengthCm} onChange={(e) => set("lengthCm", e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Width (cm)</span>
              <input type="number" min={0} className="input" value={value.widthCm} onChange={(e) => set("widthCm", e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Height (cm)</span>
              <input type="number" min={0} className="input" value={value.heightCm} onChange={(e) => set("heightCm", e.target.value)} />
            </label>
          </div>
        )}

        {standardResult && !standardResult.serviceable && standardResult.blockReason && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{standardResult.blockReason}</p>
        )}

        <div className="flex items-center justify-between rounded-lg border border-lbc-border bg-lbc-bg px-4 py-3">
          <span className="text-sm text-gray-600">Charge (LBC Parcel Rates)</span>
          <span className="text-lg font-bold text-lbc-red">{formatCurrency(displayCharge)}</span>
        </div>
      </div>
    </div>
  );
}
