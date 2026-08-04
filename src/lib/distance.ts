// Great-circle distance in km, with a small road-detour multiplier so the
// estimate is closer to actual driving distance for on-demand fare quotes.
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLineKm = R * c;
  const ROAD_DETOUR_FACTOR = 1.3;
  return Math.round(straightLineKm * ROAD_DETOUR_FACTOR * 10) / 10;
}
