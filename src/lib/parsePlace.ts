import type { Address } from "../types";
import type { PlaceValue } from "../components/AddressAutocompleteInput";

function findComponent(components: google.maps.GeocoderAddressComponent[] | undefined, types: string[]): string {
  if (!components) return "";
  for (const type of types) {
    const match = components.find((c) => c.types.includes(type));
    if (match) return match.long_name;
  }
  return "";
}

/** Best-effort mapping of a Google Places result into our PH Province/City/Barangay/Street shape. */
export function placeToAddress(place: PlaceValue): Address {
  const components = place.components;
  const streetNumber = findComponent(components, ["street_number"]);
  const route = findComponent(components, ["route"]);
  return {
    province: findComponent(components, ["administrative_area_level_2", "administrative_area_level_1"]),
    city: findComponent(components, ["locality", "administrative_area_level_3"]),
    barangay: findComponent(components, ["sublocality_level_1", "neighborhood", "sublocality"]),
    street: [streetNumber, route].filter(Boolean).join(" ") || place.address,
    houseNumber: streetNumber,
  };
}
