import { useRef } from "react";
import { Autocomplete } from "@react-google-maps/api";
import { MapPin } from "lucide-react";
import { useMaps } from "../context/MapsContext";

export interface PlaceValue {
  address: string;
  lat?: number;
  lng?: number;
  components?: google.maps.GeocoderAddressComponent[];
}

export default function AddressAutocompleteInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: PlaceValue;
  onChange: (place: PlaceValue) => void;
}) {
  const { isLoaded, apiKeyConfigured } = useMaps();
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  function handlePlaceChanged() {
    const place = autocompleteRef.current?.getPlace();
    if (!place) return;
    onChange({
      address: place.formatted_address || place.name || value.address,
      lat: place.geometry?.location?.lat(),
      lng: place.geometry?.location?.lng(),
      components: place.address_components,
    });
  }

  const inputEl = (
    <div className="relative">
      <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-lbc-red" />
      <input
        className="input pl-10"
        placeholder={placeholder}
        value={value.address}
        onChange={(e) => onChange({ address: e.target.value, lat: undefined, lng: undefined })}
      />
    </div>
  );

  if (!apiKeyConfigured) {
    return (
      <div>
        {inputEl}
        <p className="mt-1 text-xs text-amber-600">
          Google Maps API key not configured — using manual address entry (no autocomplete).
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="input animate-pulse text-gray-400">Loading map…</div>;
  }

  return (
    <Autocomplete
      onLoad={(ac) => (autocompleteRef.current = ac)}
      onPlaceChanged={handlePlaceChanged}
      options={{ componentRestrictions: { country: "ph" } }}
    >
      {inputEl}
    </Autocomplete>
  );
}
