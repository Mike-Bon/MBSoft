import { useEffect, useState } from "react";
import { GoogleMap, DirectionsRenderer } from "@react-google-maps/api";
import { Navigation, Loader2 } from "lucide-react";
import { useMaps } from "../context/MapsContext";
import type { LatLng } from "../lib/trackingGeo";

const CONTAINER_STYLE = { width: "100%", height: "260px" };

export default function RouteMap({
  origin,
  destination,
  onRouteComputed,
}: {
  origin: LatLng;
  destination: LatLng;
  onRouteComputed?: (distanceKm: number) => void;
}) {
  const { isLoaded, apiKeyConfigured } = useMaps();
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    setDirections(null);
    setError(null);

    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          const meters = result.routes[0]?.legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0) || 0;
          if (meters > 0) onRouteComputed?.(Math.round((meters / 1000) * 10) / 10);
        } else {
          setError("Couldn't find a driving route between these addresses.");
        }
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, origin.lat, origin.lng, destination.lat, destination.lng]);

  if (!apiKeyConfigured) return null;

  if (!isLoaded) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-xl border border-lbc-border bg-lbc-bg text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[260px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-lbc-border bg-lbc-bg text-center">
        <Navigation className="h-6 w-6 text-gray-300" />
        <p className="px-4 text-sm text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-lbc-border">
      <GoogleMap
        mapContainerStyle={CONTAINER_STYLE}
        center={origin}
        zoom={12}
        options={{ disableDefaultUI: true, zoomControl: true }}
      >
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{ suppressMarkers: false, polylineOptions: { strokeColor: "#d0021b", strokeWeight: 4 } }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
