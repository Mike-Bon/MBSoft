import { useState } from "react";
import { Bike, Calculator, CheckCircle2, Clock, MapPinned, Route as RouteIcon, Stethoscope } from "lucide-react";
import PageHeader from "../components/PageHeader";
import AddressAutocompleteInput, { type PlaceValue } from "../components/AddressAutocompleteInput";
import ConfirmAddressModal from "../components/ConfirmAddressModal";
import RouteMap, { type RouteResult } from "../components/RouteMap";
import { useConfig } from "../context/ConfigContext";
import { useData } from "../context/DataContext";
import { haversineKm } from "../lib/distance";
import { geocodeAddress } from "../lib/geocode";
import { calculateFare, estimateDurationMinutes, vehicleToPricingConfig } from "../lib/pricingEngine";
import { placeToAddress } from "../lib/parsePlace";
import { formatCurrency, generateTrackingNumber, isValidMobile } from "../lib/utils";
import { LiabilityDisclaimer } from "../components/DisclaimerNote";
import { classNames } from "../lib/utils";
import type { CargoType } from "../types";

const emptyPlace: PlaceValue = { address: "" };

type AddressField = "pickup" | "dropoff";

export default function OnDemandBooking() {
  const { vehicles, productTypes } = useConfig();
  const { createBooking, recurringShipments } = useData();

  // Only vehicles marked visible are ever offered to customers — for MVP that's
  // just Motorcycle, but enabling another vehicle from Administration is all it
  // takes to make it available here too, no code changes required.
  const vehicle = vehicles.find((v) => v.visible && v.active) || vehicles[0];

  // Draft mirrors what's typed/selected in the input; the confirmed value is only
  // committed once the user accepts the "Confirm address" popup for a real selection.
  const [pickupDraft, setPickupDraft] = useState<PlaceValue>(emptyPlace);
  const [dropoffDraft, setDropoffDraft] = useState<PlaceValue>(emptyPlace);
  const [pickup, setPickup] = useState<PlaceValue>(emptyPlace);
  const [dropoff, setDropoff] = useState<PlaceValue>(emptyPlace);
  const [pendingConfirm, setPendingConfirm] = useState<{ field: AddressField; place: PlaceValue } | null>(null);

  const [productType, setProductType] = useState<"standard" | "medical">("standard");
  const [manualDistance, setManualDistance] = useState("");
  const [manualDuration, setManualDuration] = useState("");
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [result, setResult] = useState<{ distanceKm: number; durationMinutes: number; fare: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showBookingForm, setShowBookingForm] = useState(false);
  const [consigneeName, setConsigneeName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookedTracking, setBookedTracking] = useState<string | null>(null);

  const canGeolocate = Boolean(pickup.lat && pickup.lng && dropoff.lat && dropoff.lng);

  function handleFieldChange(field: AddressField, place: PlaceValue) {
    const setDraft = field === "pickup" ? setPickupDraft : setDropoffDraft;
    const setConfirmed = field === "pickup" ? setPickup : setDropoff;
    setDraft(place);
    if (place.lat && place.lng) {
      // A real suggestion was selected (not free typing) — ask the user to confirm it.
      setPendingConfirm({ field, place });
    } else {
      // Free typing (no Places selection, e.g. no Maps key or user prefers typing) —
      // commit directly, no confirmation needed since there's nothing to confirm yet.
      setConfirmed(place);
    }
  }

  function confirmPendingAddress() {
    if (!pendingConfirm) return;
    const { field, place } = pendingConfirm;
    if (field === "pickup") setPickup(place);
    else setDropoff(place);
    setRoute(null);
    setPendingConfirm(null);
  }

  function cancelPendingAddress() {
    if (!pendingConfirm) return;
    const { field } = pendingConfirm;
    // Revert the visible input back to the last confirmed address.
    if (field === "pickup") setPickupDraft(pickup);
    else setDropoffDraft(dropoff);
    setPendingConfirm(null);
  }

  // Recent-destination quick picks (mobile) — it's the customer's own saved data,
  // so it commits straight to the confirmed destination (no confirm popup), with a
  // best-effort geocode for map/route support and a graceful manual-entry fallback.
  async function handleQuickPick(shipment: (typeof recurringShipments)[number]) {
    const addr = shipment.consignee.address;
    const addressText = [addr.houseNumber, addr.street, addr.barangay, addr.city, addr.province]
      .filter(Boolean)
      .join(", ");
    const place: PlaceValue = { address: addressText };
    setDropoffDraft(place);
    setDropoff(place);
    setRoute(null);

    const coords = await geocodeAddress(addressText);
    if (coords) {
      const geocoded: PlaceValue = { address: addressText, ...coords };
      setDropoffDraft(geocoded);
      setDropoff(geocoded);
    }
  }

  function handleCalculate() {
    setError(null);
    setResult(null);
    setShowBookingForm(false);
    setBookedTracking(null);

    if (!pickup.address || !dropoff.address) {
      setError("Select and confirm both a pickup and drop-off address.");
      return;
    }
    if (!vehicle) {
      setError("No delivery vehicle is currently available.");
      return;
    }

    let distanceKm: number;
    let durationMinutes: number;
    if (route) {
      distanceKm = route.distanceKm;
      durationMinutes = route.durationMinutes;
    } else if (canGeolocate) {
      // Route hasn't loaded yet (or failed) but we have real coordinates — fall
      // back to a straight-line + road-detour estimate for both distance and time.
      distanceKm = haversineKm(pickup.lat!, pickup.lng!, dropoff.lat!, dropoff.lng!);
      durationMinutes = estimateDurationMinutes(distanceKm);
    } else if (manualDistance && manualDuration) {
      distanceKm = Number(manualDistance);
      durationMinutes = Number(manualDuration);
      if (!distanceKm || distanceKm <= 0) {
        setError("Enter a valid distance in km.");
        return;
      }
      if (!durationMinutes || durationMinutes <= 0) {
        setError("Enter a valid travel time in minutes.");
        return;
      }
    } else {
      setError("Select addresses from the suggestions, or enter distance and travel time manually below.");
      return;
    }

    const product = productTypes.find((p) => p.name.toLowerCase() === productType) || productTypes[0];
    const { finalFare } = calculateFare(distanceKm, durationMinutes, vehicleToPricingConfig(vehicle), product.multiplier);
    setResult({ distanceKm, durationMinutes, fare: finalFare });
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
    <div className="relative">
      {/* Center-screen 75th anniversary watermark — mobile only, decorative */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-16 bottom-20 z-0 flex items-center justify-center lg:hidden"
      >
        <img
          src="/lbc-75-anniversary.png"
          alt=""
          className="h-64 w-64 object-contain opacity-10"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>

      <PageHeader title="Courier Fare Calculator" subtitle="Know your delivery price instantly." />

      <div className="relative z-10 mx-auto max-w-2xl">
        <div className="space-y-6 rounded-2xl bg-transparent p-0 lg:border lg:border-lbc-border lg:bg-white lg:p-6 lg:shadow-sm">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Pickup Address</span>
            <AddressAutocompleteInput
              placeholder="Search pickup address in the Philippines"
              value={pickupDraft}
              onChange={(place) => handleFieldChange("pickup", place)}
            />
          </div>

          <hr className="hidden border-lbc-border lg:block" />

          <div>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Drop-off Address</span>
            <AddressAutocompleteInput
              placeholder="Search drop-off address"
              value={dropoffDraft}
              onChange={(place) => handleFieldChange("dropoff", place)}
            />
          </div>

          {recurringShipments.length > 0 && (
            <div className="-mt-2 flex flex-wrap gap-2 lg:hidden">
              {recurringShipments.slice(0, 4).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleQuickPick(r)}
                  className="flex items-center gap-1.5 rounded-full border border-lbc-border bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-lbc-red hover:text-lbc-red"
                >
                  <MapPinned className="h-3.5 w-3.5 text-gray-400" />
                  {r.label || r.consignee.name} · {r.consignee.address.city}
                </button>
              ))}
            </div>
          )}

          {canGeolocate && (
            <RouteMap
              origin={{ lat: pickup.lat!, lng: pickup.lng! }}
              destination={{ lat: dropoff.lat!, lng: dropoff.lng! }}
              onRouteComputed={setRoute}
            />
          )}

          {!canGeolocate && (pickup.address || dropoff.address) && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Distance (km)</span>
                <input
                  className="input"
                  type="number"
                  min={0.1}
                  step={0.1}
                  placeholder="e.g. 7.5"
                  value={manualDistance}
                  onChange={(e) => setManualDistance(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Travel time (min)</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="e.g. 20"
                  value={manualDuration}
                  onChange={(e) => setManualDuration(e.target.value)}
                />
              </label>
              <p className="col-span-2 -mt-1 text-xs text-gray-400">
                Pick an address from the dropdown suggestions to auto-calculate the route, or enter it manually.
              </p>
            </div>
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
                        "flex min-w-0 items-start gap-3 rounded-xl border p-4 text-left transition",
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
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-gray-900">
                          {p.name}
                          {selected && (
                            <span className="rounded-full bg-lbc-red px-2 py-0.5 text-[10px] font-semibold text-white">
                              Selected
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">{p.description}</p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-lbc-border bg-white px-4 py-3 shadow-sm lg:bg-lbc-bg lg:shadow-none">
            <span className="text-sm text-gray-600">Delivery vehicle</span>
            <span className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Bike className="h-4 w-4" /> {vehicle?.name || "Motorcycle"}
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
            <div className="text-center">
              <p className="text-sm text-gray-500">Estimated Fare</p>
              <p className="text-4xl font-extrabold text-lbc-red">{formatCurrency(result.fare)}</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-lbc-border bg-lbc-bg px-4 py-3">
                <RouteIcon className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Estimated Distance</p>
                  <p className="text-sm font-bold text-gray-900">{result.distanceKm} km</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-lbc-border bg-lbc-bg px-4 py-3">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Estimated Travel Time</p>
                  <p className="text-sm font-bold text-gray-900">{result.durationMinutes} minutes</p>
                </div>
              </div>
            </div>

            {!showBookingForm ? (
              <button type="button" onClick={() => setShowBookingForm(true)} className="btn-primary mt-5 w-full">
                Book Now
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
              <p className="font-bold text-emerald-800">Booking Successful</p>
              <p className="text-sm text-emerald-700">
                Our representative will contact you shortly. Tracking number{" "}
                <span className="font-mono font-semibold">{bookedTracking}</span> has been added to your Shipments.
              </p>
            </div>
          </div>
        )}
      </div>

      {pendingConfirm && (
        <ConfirmAddressModal
          label={pendingConfirm.field === "pickup" ? "Pickup Address" : "Drop-off Address"}
          address={pendingConfirm.place.address}
          onConfirm={confirmPendingAddress}
          onCancel={cancelPendingAddress}
        />
      )}
    </div>
  );
}
