import { useEffect, useMemo, useState } from "react";
import { GoogleMap, Marker, Polyline } from "@react-google-maps/api";
import { useMaps } from "../context/MapsContext";
import { useAuth } from "../context/AuthContext";
import type { Booking } from "../types";
import { getDropoffCoord, getPickupCoord, lerp, progressForStatus } from "../lib/trackingGeo";
import { MapPin, Navigation } from "lucide-react";

const CONTAINER_STYLE = { width: "100%", height: "100%" };

export default function TrackingMap({ booking }: { booking: Booking }) {
  const { isLoaded, apiKeyConfigured } = useMaps();
  const { profile } = useAuth();

  const pickup = useMemo(() => getPickupCoord(booking, profile), [booking, profile]);
  const dropoff = useMemo(() => getDropoffCoord(booking), [booking]);
  const targetProgress = progressForStatus(booking.status);

  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    setAnimatedProgress(0);
    if (booking.status === "Delivered" || booking.status === "Booked") {
      setAnimatedProgress(targetProgress);
      return;
    }
    let raf: number;
    let start: number | null = null;
    const DURATION = 3500;
    function tick(ts: number) {
      if (start === null) start = ts;
      const elapsed = (ts - start) % (DURATION * 2);
      const t = elapsed < DURATION ? elapsed / DURATION : 1 - (elapsed - DURATION) / DURATION;
      setAnimatedProgress(targetProgress * (0.55 + 0.45 * t));
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [booking.status, targetProgress]);

  if (!apiKeyConfigured) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-lbc-border bg-lbc-bg p-8 text-center">
        <Navigation className="h-8 w-8 text-gray-300" />
        <p className="font-medium text-gray-500">Live map unavailable</p>
        <p className="max-w-xs text-sm text-gray-400">
          Set <code className="rounded bg-white px-1 py-0.5">VITE_GOOGLE_MAPS_API_KEY</code> in your .env to enable
          the live tracking map.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="flex h-full items-center justify-center text-gray-400">Loading map…</div>;
  }

  if (!pickup || !dropoff) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-lbc-border bg-lbc-bg p-8 text-center">
        <MapPin className="h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-400">No map coordinates available for this shipment yet.</p>
      </div>
    );
  }

  const riderPosition = lerp(pickup, dropoff, Math.min(1, Math.max(0, animatedProgress)));
  const bounds = { lat: (pickup.lat + dropoff.lat) / 2, lng: (pickup.lng + dropoff.lng) / 2 };

  return (
    <GoogleMap
      mapContainerStyle={CONTAINER_STYLE}
      center={bounds}
      zoom={11}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
      }}
    >
      <Polyline path={[pickup, dropoff]} options={{ strokeColor: "#d0021b", strokeOpacity: 0.7, strokeWeight: 3 }} />
      <Marker position={pickup} label={{ text: "A", color: "white", fontSize: "11px" }} />
      <Marker position={dropoff} label={{ text: "B", color: "white", fontSize: "11px" }} />
      {booking.status !== "Booked" && booking.status !== "Delivered" && (
        <Marker
          position={riderPosition}
          icon={{
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#d0021b",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          }}
        />
      )}
    </GoogleMap>
  );
}
