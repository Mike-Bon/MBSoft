import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Download, UploadCloud, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useConfig } from "../context/ConfigContext";
import { useData } from "../context/DataContext";
import { calculateOnDemandRateForParcel } from "../lib/rateCalculators";
import { computeParcelFare } from "../lib/parcelPricingEngine";
import { loadCoverage, type CoverageData } from "../lib/coverage";
import { PRODUCT_LABEL, type ParcelProductKey } from "../data/lbcConstants";
import { formatCurrency, generateTrackingNumber, isValidMobile } from "../lib/utils";
import { LiabilityDisclaimer } from "./DisclaimerNote";
import type { CargoType } from "../types";

const PRODUCT_KEYS = Object.keys(PRODUCT_LABEL) as ParcelProductKey[];

const TEMPLATE_HEADERS = [
  "Consignee Name",
  "Province",
  "City / Municipality",
  "Barangay",
  "Street",
  "House Number",
  "Landmark",
  "Contact Number",
  "Type of Cargo (standard / on_demand_standard / on_demand_medical)",
  `Product SKU (standard only: ${PRODUCT_KEYS.join(" / ")})`,
  "Weight (kg — required for gen_cargo, optional otherwise)",
];

const TEMPLATE_SAMPLE = [
  "Juan Dela Cruz",
  "Metro Manila",
  "Quezon City",
  "Bagong Pag-asa",
  "123 Mabini St.",
  "12",
  "Near barangay hall",
  "09171234567",
  "standard",
  "np_reg",
  "",
];

interface ParsedRow {
  name: string;
  province: string;
  city: string;
  barangay: string;
  street: string;
  houseNumber: string;
  landmark: string;
  contactNumber: string;
  cargoType: CargoType;
  product: ParcelProductKey;
  weightKg?: number;
  charge: number;
  distanceKm?: number;
  error?: string;
}

const MAX_ROWS = 100;

/** Bulk rows are free-text province/city/barangay, so match against the real
 * coverage dataset case-insensitively rather than requiring exact casing. */
function matchCoverageKey(options: string[], text: string): string | undefined {
  const needle = text.trim().toLowerCase();
  return options.find((o) => o.toLowerCase() === needle);
}

export default function BulkUploadPanel() {
  const { profile } = useAuth();
  const { vehicles, productTypes } = useConfig();
  const activeVehicle = vehicles.find((v) => v.visible && v.active) || vehicles[0];
  const { createBookings } = useData();
  const inputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<number | null>(null);

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_SAMPLE]);
    ws["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 24 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Consignees");
    XLSX.writeFile(wb, "LBC-Bulk-Booking-Template.xlsx");
  }

  function handleFile(file: File) {
    setParseError(null);
    setSuccess(null);
    setFileName(file.name);
    setProcessing(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

        if (json.length === 0) {
          setParseError("The file has no data rows.");
          setRows([]);
          return;
        }
        if (json.length > MAX_ROWS) {
          setParseError(`This file has ${json.length} rows — the maximum is ${MAX_ROWS}. Please split it into batches.`);
          setRows([]);
          return;
        }
        if (!profile) return;

        let coverage: CoverageData | null = null;
        const needsCoverage = json.some((r) => String(r["Type of Cargo (standard / on_demand_standard / on_demand_medical)"] ?? "").trim().toLowerCase() !== "on_demand_standard" && String(r["Type of Cargo (standard / on_demand_standard / on_demand_medical)"] ?? "").trim().toLowerCase() !== "on_demand_medical");
        if (needsCoverage) {
          coverage = await loadCoverage();
        }

        const parsed: ParsedRow[] = json.map((r) => {
          const get = (key: string) => String(r[key] ?? "").trim();
          const name = get("Consignee Name");
          const provinceRaw = get("Province");
          const cityRaw = get("City / Municipality");
          const barangayRaw = get("Barangay");
          const street = get("Street");
          const houseNumber = get("House Number");
          const landmark = get("Landmark");
          const contactNumber = get("Contact Number");
          const rawCargo = get("Type of Cargo (standard / on_demand_standard / on_demand_medical)").toLowerCase();
          const cargoType: CargoType =
            rawCargo === "on_demand_standard" || rawCargo === "on_demand_medical" ? (rawCargo as CargoType) : "standard";
          const rawProduct = get(`Product SKU (standard only: ${PRODUCT_KEYS.join(" / ")})`).toLowerCase();
          const product: ParcelProductKey = (PRODUCT_KEYS as string[]).includes(rawProduct) ? (rawProduct as ParcelProductKey) : "np_reg";
          const weightRaw = get("Weight (kg — required for gen_cargo, optional otherwise)");
          const weightKg = weightRaw ? Number(weightRaw) : undefined;

          let error: string | undefined;
          if (!name) error = "Missing consignee name";
          else if (!provinceRaw || !cityRaw) error = "Missing province/city";
          else if (!isValidMobile(contactNumber)) error = "Invalid contact number";

          let charge = 0;
          let distanceKm: number | undefined;
          let province = provinceRaw;
          let city = cityRaw;
          let barangay = barangayRaw;

          if (!error && cargoType === "standard") {
            if (!coverage) {
              error = "Coverage data unavailable";
            } else {
              const matchedProvince = matchCoverageKey(Object.keys(coverage), provinceRaw);
              const matchedCity = matchedProvince ? matchCoverageKey(Object.keys(coverage[matchedProvince]), cityRaw) : undefined;
              const matchedBarangay =
                matchedProvince && matchedCity ? matchCoverageKey(Object.keys(coverage[matchedProvince][matchedCity]), barangayRaw) : undefined;

              if (!matchedProvince || !matchedCity || !matchedBarangay) {
                error = "Could not match address to coverage data — check spelling";
              } else {
                province = matchedProvince;
                city = matchedCity;
                barangay = matchedBarangay;
                const zone = coverage[matchedProvince][matchedCity][matchedBarangay];
                const result = computeParcelFare({
                  product,
                  originProvince: profile.address.province,
                  originCity: profile.address.city,
                  destProvince: matchedProvince,
                  destCity: matchedCity,
                  destBarangay: matchedBarangay,
                  destZone: zone,
                  weightKg,
                });
                if (!result.serviceable) {
                  error = result.blockReason || "Not serviceable";
                } else {
                  charge = result.finalFare;
                }
              }
            }
          } else if (!error) {
            const productType = cargoType === "on_demand_medical" ? "medical" : "standard";
            const result = calculateOnDemandRateForParcel(
              profile.address.province,
              profile.address.city,
              provinceRaw,
              cityRaw,
              productType,
              activeVehicle,
              productTypes
            );
            charge = result.charge;
            distanceKm = result.distanceKm;
          }

          return {
            name,
            province,
            city,
            barangay,
            street,
            houseNumber,
            landmark,
            contactNumber,
            cargoType,
            product,
            weightKg,
            charge,
            distanceKm,
            error,
          };
        });

        setRows(parsed);
      } catch {
        setParseError("Couldn't read this file. Make sure it's a .xlsx file exported from the template.");
        setRows([]);
      } finally {
        setProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  }

  const validRows = rows.filter((r) => !r.error);
  const invalidCount = rows.length - validRows.length;
  const totalCharge = validRows.reduce((sum, r) => sum + r.charge, 0);

  async function handleSubmit() {
    if (!agreed || validRows.length === 0) return;
    setSubmitting(true);
    try {
      await createBookings(
        validRows.map((r) => ({
          trackingNumber: generateTrackingNumber(),
          bookingType: r.cargoType === "standard" ? "parcel" : "on_demand",
          consignee: {
            name: r.name,
            address: {
              province: r.province,
              city: r.city,
              barangay: r.barangay,
              street: r.street,
              houseNumber: r.houseNumber,
              landmark: r.landmark || undefined,
            },
            contactNumber: r.contactNumber,
            cargoType: r.cargoType,
          },
          distanceKm: r.distanceKm,
          charge: r.charge,
          status: "Booked",
          parcelProductSku: r.cargoType === "standard" ? r.product : undefined,
        }))
      );
      setSuccess(validRows.length);
      setRows([]);
      setFileName(null);
      setAgreed(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900">1. Download the Excel template</h3>
            <p className="mt-0.5 text-sm text-gray-500">
              Fill in up to {MAX_ROWS} consignees, one per row. For Standard cargo, Province/City/Barangay must match
              real LBC coverage areas — Declared Value and General Cargo dimensions aren't supported via bulk upload.
            </p>
          </div>
          <button type="button" onClick={downloadTemplate} className="btn-secondary">
            <Download className="h-4 w-4" />
            Download Template
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold text-gray-900">2. Upload your completed file</h3>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 flex w-full items-center gap-3 rounded-lg border border-dashed border-lbc-border bg-lbc-bg px-4 py-4 text-left text-sm transition hover:border-lbc-red"
        >
          <UploadCloud className="h-5 w-5 shrink-0 text-gray-400" />
          <span className="text-gray-500">{processing ? "Processing…" : fileName || "Click to choose a .xlsx file"}</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {parseError && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {parseError}
          </p>
        )}
      </div>

      {rows.length > 0 && (
        <div className="card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-gray-900">3. Review ({rows.length} rows)</h3>
            {invalidCount > 0 && (
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                {invalidCount} row{invalidCount > 1 ? "s" : ""} with errors will be skipped
              </span>
            )}
          </div>
          <div className="max-h-80 overflow-auto rounded-lg border border-lbc-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-lbc-bg text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Destination</th>
                  <th className="px-3 py-2">Cargo</th>
                  <th className="px-3 py-2">Charge</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-lbc-border">
                    <td className="px-3 py-2">{r.name || "—"}</td>
                    <td className="px-3 py-2 text-gray-500">
                      {r.city}, {r.province}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{r.cargoType === "standard" ? PRODUCT_LABEL[r.product] : r.cargoType}</td>
                    <td className="px-3 py-2 font-semibold">{r.error ? "—" : formatCurrency(r.charge)}</td>
                    <td className="px-3 py-2">
                      {r.error ? (
                        <span className="text-xs font-medium text-red-600">{r.error}</span>
                      ) : (
                        <span className="text-xs font-medium text-emerald-600">Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-lbc-bg px-4 py-3">
            <span className="text-sm text-gray-600">Total charge ({validRows.length} bookings)</span>
            <span className="text-lg font-bold text-lbc-red">{formatCurrency(totalCharge)}</span>
          </div>

          <div className="mt-4">
            <LiabilityDisclaimer checked={agreed} onChange={setAgreed} />
          </div>

          <button
            type="button"
            disabled={!agreed || validRows.length === 0 || submitting}
            onClick={handleSubmit}
            className="btn-primary mt-4 w-full"
          >
            {submitting ? "Booking…" : `Submit ${validRows.length} Bookings`}
          </button>
        </div>
      )}

      {success !== null && (
        <div className="card flex items-start gap-3 border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-bold text-emerald-800">Bulk booking submitted</p>
            <p className="text-sm text-emerald-700">{success} shipments were added to your Shipments list.</p>
          </div>
        </div>
      )}
    </div>
  );
}
