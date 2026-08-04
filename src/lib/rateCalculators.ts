import type { ProductType, Vehicle } from "../types";
import { calculateFare, estimateDurationMinutes, vehicleToPricingConfig } from "./pricingEngine";

const ISLAND_GROUP: Record<string, "Luzon" | "Visayas" | "Mindanao"> = {
  "Metro Manila": "Luzon",
  Bulacan: "Luzon",
  Laguna: "Luzon",
  Cavite: "Luzon",
  Pampanga: "Luzon",
  Rizal: "Luzon",
  Batangas: "Luzon",
  Cebu: "Visayas",
  Iloilo: "Visayas",
  "Negros Occidental": "Visayas",
  Davao: "Mindanao",
};

function islandGroupOf(province: string): "Luzon" | "Visayas" | "Mindanao" {
  return ISLAND_GROUP[province] || "Luzon";
}

/**
 * Standard Calculator — LBC's branch-network parcel rate, tiered by zone
 * (same city / same province / same island group / inter-island) plus a
 * per-kilogram surcharge above 1kg. This mirrors LBC's published door-to-door
 * rate structure at a simplified, illustrative level.
 */
export function calculateStandardRate(
  shipperProvince: string,
  shipperCity: string,
  consigneeProvince: string,
  consigneeCity: string,
  weightKg: number
): number {
  let base: number;
  if (shipperCity && shipperCity === consigneeCity) {
    base = 85;
  } else if (shipperProvince === consigneeProvince) {
    base = 105;
  } else if (islandGroupOf(shipperProvince) === islandGroupOf(consigneeProvince)) {
    base = 140;
  } else {
    base = 175;
  }
  const extraWeight = Math.max(0, weightKg - 1);
  return Math.round(base + extraWeight * 18);
}

/**
 * Estimated pickup→drop-off distance for on-demand cargo booked from the
 * Parcel & Cargo form, where only province/city (not map coordinates) are
 * known for the consignee. Used to price via the same On-Demand Calculator
 * rate card configured in Administration > Pricing.
 */
export function estimateZoneDistanceKm(
  shipperProvince: string,
  shipperCity: string,
  consigneeProvince: string,
  consigneeCity: string
): number {
  if (shipperCity && shipperCity === consigneeCity) return 4;
  if (shipperProvince === consigneeProvince) return 16;
  if (islandGroupOf(shipperProvince) === islandGroupOf(consigneeProvince)) return 55;
  return 220;
}

export function calculateOnDemandRateForParcel(
  shipperProvince: string,
  shipperCity: string,
  consigneeProvince: string,
  consigneeCity: string,
  productTypeName: "standard" | "medical",
  vehicle: Vehicle,
  productTypes: ProductType[]
): { distanceKm: number; charge: number } {
  const distanceKm = estimateZoneDistanceKm(shipperProvince, shipperCity, consigneeProvince, consigneeCity);
  const durationMinutes = estimateDurationMinutes(distanceKm);
  const product = productTypes.find((p) => p.name.toLowerCase() === productTypeName) || productTypes[0];
  const { finalFare } = calculateFare(distanceKm, durationMinutes, vehicleToPricingConfig(vehicle), product.multiplier);
  return { distanceKm, charge: finalFare };
}
