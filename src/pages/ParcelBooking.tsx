import { useMemo, useState } from "react";
import { Plus, BookmarkPlus, CheckCircle2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import ConsigneeRow, { emptyConsigneeRow, type ConsigneeRowValue } from "../components/ConsigneeRow";
import BulkUploadPanel from "../components/BulkUploadPanel";
import { LiabilityDisclaimer } from "../components/DisclaimerNote";
import { useAuth } from "../context/AuthContext";
import { useConfig } from "../context/ConfigContext";
import { useData } from "../context/DataContext";
import { calculateStandardRate, calculateOnDemandRateForParcel } from "../lib/rateCalculators";
import { formatCurrency, generateTrackingNumber } from "../lib/utils";
import { classNames, isValidMobile } from "../lib/utils";

const MAX_CONSIGNEES = 10;
let rowKeyCounter = 0;

type Mode = "single" | "bulk";

export default function ParcelBooking() {
  const { profile } = useAuth();
  const { vehicles, productTypes } = useConfig();
  const { createBookings, recurringShipments, saveRecurringShipment } = useData();
  const activeVehicle = vehicles.find((v) => v.visible && v.active) || vehicles[0];

  const [mode, setMode] = useState<Mode>("single");
  const [rows, setRows] = useState<ConsigneeRowValue[]>([emptyConsigneeRow(String(rowKeyCounter++))]);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<number | null>(null);
  const [saveAsRecurring, setSaveAsRecurring] = useState(false);

  const rowCharges = useMemo(() => {
    if (!profile) return rows.map(() => ({ charge: 0, distanceKm: undefined as number | undefined }));
    return rows.map((row) => {
      if (row.cargoType === "standard") {
        const charge = calculateStandardRate(
          profile.address.province,
          profile.address.city,
          row.address.province,
          row.address.city,
          row.weightKg
        );
        return { charge, distanceKm: undefined };
      }
      const productType = row.cargoType === "on_demand_medical" ? "medical" : "standard";
      return calculateOnDemandRateForParcel(
        profile.address.province,
        profile.address.city,
        row.address.province,
        row.address.city,
        productType,
        activeVehicle,
        productTypes
      );
    });
  }, [rows, profile, activeVehicle, productTypes]);

  const totalCharge = rowCharges.reduce((sum, r) => sum + r.charge, 0);

  function updateRow(index: number, value: ConsigneeRowValue) {
    setRows((prev) => prev.map((r, i) => (i === index ? value : r)));
  }

  function addRow() {
    if (rows.length >= MAX_CONSIGNEES) return;
    setRows((prev) => [...prev, emptyConsigneeRow(String(rowKeyCounter++))]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function applyRecurring(id: string) {
    const template = recurringShipments.find((r) => r.id === id);
    if (!template) return;
    setRows((prev) => [
      ...prev,
      {
        key: String(rowKeyCounter++),
        name: template.consignee.name,
        address: { ...template.consignee.address, instructions: "" },
        contactNumber: template.consignee.contactNumber,
        cargoType: template.consignee.cargoType,
        weightKg: 1,
      },
    ]);
  }

  async function handleSubmit() {
    setError(null);
    if (!profile) return;

    for (const row of rows) {
      if (!row.name.trim()) return setError("Every consignee needs a name.");
      if (!row.address.province || !row.address.city) return setError("Every consignee needs a province and city.");
      if (!isValidMobile(row.contactNumber)) return setError("Every consignee needs a valid PH mobile number.");
    }
    if (!agreed) return setError("Please confirm the disclaimer to continue.");

    setSubmitting(true);
    try {
      await createBookings(
        rows.map((row, i) => ({
          trackingNumber: generateTrackingNumber(),
          bookingType: row.cargoType === "standard" ? "parcel" : "on_demand",
          consignee: {
            name: row.name,
            address: row.address,
            contactNumber: row.contactNumber,
            cargoType: row.cargoType,
          },
          distanceKm: rowCharges[i].distanceKm,
          charge: rowCharges[i].charge,
          status: "Booked",
        }))
      );

      if (saveAsRecurring) {
        for (const row of rows) {
          await saveRecurringShipment(row.name, {
            name: row.name,
            address: row.address,
            contactNumber: row.contactNumber,
            cargoType: row.cargoType,
          });
        }
      }

      setSuccess(rows.length);
      setRows([emptyConsigneeRow(String(rowKeyCounter++))]);
      setAgreed(false);
      setSaveAsRecurring(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Parcel & Cargo Booking"
        subtitle={
          profile
            ? `Shipper: ${profile.name} · ${profile.address.city}, ${profile.address.province}`
            : "Shipper: — · No address on file"
        }
      />

      <div className="mb-6 flex gap-2 rounded-xl bg-white p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={classNames(
            "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
            mode === "single" ? "bg-lbc-red text-white" : "text-gray-600 hover:bg-lbc-bg"
          )}
        >
          Single / Multiple (max 10)
        </button>
        <button
          type="button"
          onClick={() => setMode("bulk")}
          className={classNames(
            "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
            mode === "bulk" ? "bg-lbc-red text-white" : "text-gray-600 hover:bg-lbc-bg"
          )}
        >
          Bulk Upload (max 100)
        </button>
      </div>

      {mode === "bulk" ? (
        <BulkUploadPanel />
      ) : (
        <div className="space-y-5">
          {recurringShipments.length > 0 && (
            <div className="card flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Add from saved shipments:</span>
              <select
                className="input max-w-xs"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) applyRecurring(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="" disabled>
                  Select a recurring shipment…
                </option>
                {recurringShipments.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {rows.map((row, index) => (
            <ConsigneeRow
              key={row.key}
              index={index}
              value={row}
              onChange={(v) => updateRow(index, v)}
              onRemove={() => removeRow(index)}
              canRemove={rows.length > 1}
              charge={rowCharges[index]?.charge ?? 0}
              distanceKm={rowCharges[index]?.distanceKm}
            />
          ))}

          {rows.length < MAX_CONSIGNEES && (
            <button type="button" onClick={addRow} className="btn-secondary w-full">
              <Plus className="h-4 w-4" />
              Add Another Consignee ({rows.length}/{MAX_CONSIGNEES})
            </button>
          )}

          <div className="card">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-600">Total Charge ({rows.length} consignee{rows.length > 1 ? "s" : ""})</span>
              <span className="text-2xl font-extrabold text-lbc-red">{formatCurrency(totalCharge)}</span>
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                className="h-4 w-4 accent-lbc-red"
                checked={saveAsRecurring}
                onChange={(e) => setSaveAsRecurring(e.target.checked)}
              />
              <BookmarkPlus className="h-4 w-4 text-lbc-red" />
              Save these consignees as recurring shipments for next time
            </label>

            <div className="mt-4">
              <LiabilityDisclaimer checked={agreed} onChange={setAgreed} />
            </div>

            {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <button type="button" disabled={submitting} onClick={handleSubmit} className="btn-primary mt-4 w-full">
              {submitting ? "Booking…" : `Book ${rows.length} Shipment${rows.length > 1 ? "s" : ""}`}
            </button>
          </div>

          {success !== null && (
            <div className="card flex items-start gap-3 border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-bold text-emerald-800">Booking confirmed</p>
                <p className="text-sm text-emerald-700">{success} shipment(s) added to your Shipments list.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
