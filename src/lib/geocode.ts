/** Best-effort address → coordinates lookup for prefilling a saved address as a
 * confirmed map point (e.g. tapping a "recent destination" chip). Resolves `null`
 * on any failure — callers should fall back to the manual distance/time entry path,
 * same as any other address without coordinates. */
export function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address || typeof window === "undefined" || !window.google?.maps) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address, region: "ph" }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
        const location = results[0].geometry.location;
        resolve({ lat: location.lat(), lng: location.lng() });
      } else {
        resolve(null);
      }
    });
  });
}
