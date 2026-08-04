import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Download, UploadCloud, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useConfig } from "../context/ConfigContext";
import { useData } from "../context/DataContext";
import { calculateStandardRate, calculateOnDemandRateForParcel } from "../lib/rateCalculators";
import { formatCurrency, generateTrackingNumber, isValidMobile } from "../lib/utils";
import { LiabilityDisclaimer } from "./DisclaimerNote";
import type { CargoType } from "../types";

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
  "Weight (kg, standard only)",
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
  "1",
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
  weightKg: number;
  charge: number;
  distanceKm?: number;
  error?: string;
}

const MAX_ROWS = 100;

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
  const [success, setSuccess] = useState<number | null>(null);

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_SAMPLE]);
    ws["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Consignees");
    XLSX.writeFile(wb, "LBC-Bulk-Booking-Template.xlsx");
  }

  function handleFile(file: File) {
    setParseError(null);
    setSuccess(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
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

        const parsed: ParsedRow[] = json.map((r) => {
          const get = (key: string) => String(r[key] ?? "").trim();
          const name = get("Consignee Name");
          const province = get("Province");
          const city = get("City / Municipality");
          const barangay = get("Barangay");
          const street = get("Street");
          const houseNumber = get("House Number");
          const landmark = get("Landmark");
          const contactNumber = get("Contact Number");
          const rawCargo = get("Type of Cargo (standard / on_demand_standard / on_demand_medical)").toLowerCase();
          const cargoType: CargoType =
            rawCargo === "on_demand_standard" || rawCargo === "on_demand_medical" ? (rawCargo as CargoType) : "standard";
          const weightKg = Number(get("Weight (kg, standard only)")) || 1;

          let error: string | undefined;
          if (!name) error = "Missing consignee name";
          else if (!province || !city) error = "Missing province/city";
          else if (!isValidMobile(contactNumber)) error = "Invalid contact number";

          let charge = 0;
          let distanceKm: number | undefined;
          if (cargoType === "standard") {
            charge = calculateStandardRate(profile.address.province, profile.address.city, province, city, weightKg);
          } else {
            const productType = cargoType === "on_demand_medical" ? "medical" : "standard";
            const result = calculateOnDemandRateForParcel(
              profile.address.province,
              profile.address.city,
              province,
              city,
              productType,
              activeVehicle,
              productTypes
            );
            charge = result.charge;
            distanceKm = result.distanceKm;
          }

          return { name, province, city, barangay, street, houseNumber, landmark, contactNumber, cargoType, weightKg, charge, distanceKm, error };
        });

        setRows(parsed);
      } catch {
        setParseError("Couldn't read this file. Make sure it's a .xlsx file exported from the template.");
        setRows([]);
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
            <p className="mt-0.5 text-sm text-gray-500">Fill in up to {MAX_ROWS} consignees, one per row.</p>
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
          <span className="text-gray-500">{fileName || "Click to choose a .xlsx file"}</span>
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
                    <td className="px-3 py-2 text-gray-500">{r.cargoType}</td>
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
