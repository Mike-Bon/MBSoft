import { useState } from "react";
import { Bike, Calculator, CheckCircle2, Stethoscope } from "lucide-react";
import PageHeader from "../components/PageHeader";
import AddressAutocompleteInput, { type PlaceValue } from "../components/AddressAutocompleteInput";
import { useConfig } from "../context/ConfigContext";
import { useData } from "../context/DataContext";
import { computeFare, haversineKm } from "../lib/distance";
import { placeToAddress } from "../lib/parsePlace";
import { formatCurrency, generateTrackingNumber, isValidMobile } from "../lib/utils";
import { LiabilityDisclaimer } from "../components/DisclaimerNote";
import { classNames } from "../lib/utils";
import type { CargoType } from "../types";

const emptyPlace: PlaceValue = { address: "" };

export default function OnDemandBooking() {
  const { pricing, productTypes } = useConfig();
  const { createBooking } = useData();

  const [pickup, setPickup] = useState<PlaceValue>(emptyPlace);
  const [dropoff, setDropoff] = useState<PlaceValue>(emptyPlace);
  const [productType, setProductType] = useState<"standard" | "medical">("standard");
  const [manualDistance, setManualDistance] = useState("");
  const [result, setResult] = useState<{ distanceKm: number; fare: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showBookingForm, setShowBookingForm] = useState(false);
  const [consigneeName, setConsigneeName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookedTracking, setBookedTracking] = useState<string | null>(null);

  const canGeolocate = Boolean(pickup.lat && pickup.lng && dropoff.lat && dropoff.lng);

  function handleCalculate() {
    setError(null);
    setResult(null);
    setShowBookingForm(false);
    setBookedTracking(null);

    if (!pickup.address || !dropoff.address) {
      setError("Enter both a pickup and drop-off address.");
      return;
    }

    let distanceKm: number;
    if (canGeolocate) {
      distanceKm = haversineKm(pickup.lat!, pickup.lng!, dropoff.lat!, dropoff.lng!);
    } else if (manualDistance) {
      distanceKm = Number(manualDistance);
      if (!distanceKm || distanceKm <= 0) {
        setError("Enter a valid distance in km.");
        return;
      }
    } else {
      setError("Select addresses from the suggestions, or enter the distance manually below.");
      return;
    }

    const config = pricing.find((p) => p.productType === productType) || pricing[0];
    const fare = computeFare(distanceKm, config.baseFare, config.perKm, config.minFare);
    setResult({ distanceKm, fare });
  }

  async function handleBook() {
    if (!result) return;
    setError(null);
    if (!consigneeName.trim()) return setError("Enter the recipient's name.");
    if (!isValidMobile(contactNumber)) return setError("Enter a valid PH mobile number (e.g. 09171234567).");
    if (!agreed) return setError("Please confirm the disclaimer to continue.");

    setSubmitting(true);
    try {
      const cargoType: CargoType = productType === "medical" ? "on_demand_medical" : "on_demand_standard";
      const booking = await createBooking({
        trackingNumber: generateTrackingNumber(),
        bookingType: "on_demand",
        consignee: {
          name: consigneeName,
          address: placeToAddress(dropoff),
          contactNumber,
          cargoType,
        },
        pickupAddress: pickup.address,
        dropoffAddress: dropoff.address,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
        distanceKm: result.distanceKm,
        charge: result.fare,
        status: "Booked",
      });
      setBookedTracking(booking.trackingNumber);
      setShowBookingForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Courier Fare Calculator" subtitle="Know your delivery price instantly." />

      <div className="mx-auto max-w-2xl">
        <div className="card space-y-6">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Pickup Address</span>
            <AddressAutocompleteInput placeholder="Search pickup address in the Philippines" value={pickup} onChange={setPickup} />
          </div>

          <hr className="border-lbc-border" />

          <div>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Drop-off Address</span>
            <AddressAutocompleteInput placeholder="Search drop-off address" value={dropoff} onChange={setDropoff} />
          </div>

          {!canGeolocate && (pickup.address || dropoff.address) && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Distance (km) — manual entry</span>
              <input
                className="input"
                type="number"
                min={0.1}
                step={0.1}
                placeholder="e.g. 5.2"
                value={manualDistance}
                onChange={(e) => setManualDistance(e.target.value)}
              />
              <span className="mt-1 block text-xs text-gray-400">
                Pick an address from the dropdown suggestions to auto-calculate distance, or enter it manually.
              </span>
            </label>
          )}

          <div>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Product Type</span>
            <div className="grid grid-cols-2 gap-3">
              {productTypes
                .filter((p) => p.active)
                .map((p) => {
                  const key = p.name.toLowerCase() as "standard" | "medical";
                  const selected = productType === key;
                  const Icon = key === "medical" ? Stethoscope : Bike;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setProductType(key)}
                      className={classNames(
                        "flex items-start gap-3 rounded-xl border p-4 text-left transition",
                        selected ? "border-lbc-red bg-lbc-red-light" : "border-lbc-border hover:border-gray-300"
                      )}
                    >
                      <div
                        className={classNames(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          selected ? "bg-lbc-red text-white" : "bg-gray-100 text-gray-500"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                          {p.name}
                          {selected && <span className="rounded-full bg-lbc-red px-2 py-0.5 text-[10px] font-semibold text-white">Selected</span>}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">{p.description}</p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-lbc-border bg-lbc-bg px-4 py-3">
            <span className="text-sm text-gray-600">Delivery vehicle</span>
            <span className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Bike className="h-4 w-4" /> Motorcycle
            </span>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <button type="button" onClick={handleCalculate} className="btn-primary w-full">
            <Calculator className="h-4 w-4" />
            Calculate Fare
          </button>
        </div>

        {result && !bookedTracking && (
          <div className="card mt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Estimated distance</p>
                <p className="text-lg font-bold text-gray-900">{result.distanceKm} km</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Estimated fare</p>
                <p className="text-3xl font-extrabold text-lbc-red">{formatCurrency(result.fare)}</p>
              </div>
            </div>

            {!showBookingForm ? (
              <button type="button" onClick={() => setShowBookingForm(true)} className="btn-primary mt-5 w-full">
                Book This Delivery
              </button>
            ) : (
              <div className="mt-5 space-y-4 border-t border-lbc-border pt-5">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Recipient Name</span>
                  <input className="input" value={consigneeName} onChange={(e) => setConsigneeName(e.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Recipient Contact Number</span>
                  <input
                    className="input"
                    placeholder="09XX XXX XXXX"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                  />
                </label>
                <LiabilityDisclaimer checked={agreed} onChange={setAgreed} />
                <button type="button" disabled={submitting} onClick={handleBook} className="btn-primary w-full">
                  {submitting ? "Booking…" : `Confirm Booking · ${formatCurrency(result.fare)}`}
                </button>
              </div>
            )}
          </div>
        )}

        {bookedTracking && (
          <div className="card mt-5 flex items-start gap-3 border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-bold text-emerald-800">Booking confirmed</p>
              <p className="text-sm text-emerald-700">
                Tracking number <span className="font-mono font-semibold">{bookedTracking}</span> has been added to your
                Shipments.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
