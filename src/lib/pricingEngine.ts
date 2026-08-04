/**
 * On-demand courier fare pricing engine.
 *
 * Pure, config-driven business logic — no UI, no network calls. The customer-facing
 * calculator only ever renders `finalFare` from the returned breakdown; every other
 * field exists for the admin dashboard / internal auditing and must never be shown
 * to a customer.
 */
import type { Vehicle } from "../types";

export interface VehiclePricingConfig {
  baseFare: number;
  includedKm: number;
  rateFirstKm: number;
  rateAfterIncluded: number;
  timeRate: number;
  trafficMultiplier: number;
  demandMultiplier: number;
  zoneMultiplier: number;
  platformMargin: number;
}

/** Assumed average urban motorcycle speed, used only where a real route duration
 * isn't available (e.g. Parcel & Cargo's on-demand cargo rows, priced from a
 * province/city zone estimate rather than a real Google route). */
const ASSUMED_AVERAGE_SPEED_KMH = 25;

export function estimateDurationMinutes(distanceKm: number): number {
  return Math.round((distanceKm / ASSUMED_AVERAGE_SPEED_KMH) * 60);
}

export function vehicleToPricingConfig(vehicle: Vehicle): VehiclePricingConfig {
  return {
    baseFare: vehicle.baseFare,
    includedKm: vehicle.includedKm,
    rateFirstKm: vehicle.rateFirstKm,
    rateAfterIncluded: vehicle.rateAfterIncluded,
    timeRate: vehicle.timeRate,
    trafficMultiplier: vehicle.trafficMultiplier,
    demandMultiplier: vehicle.demandMultiplier,
    zoneMultiplier: vehicle.zoneMultiplier,
    platformMargin: vehicle.platformMargin,
  };
}

export interface FareBreakdown {
  distanceCost: number;
  timeCost: number;
  subtotal: number;
  trafficAdjustment: number;
  demandAdjustment: number;
  zoneAdjustment: number;
  standardFare: number;
  /** The only number a customer should ever see. */
  finalFare: number;
}

/**
 * First `includedKm` are free. Of the remaining chargeable distance, the first
 * kilometer is billed at `rateFirstKm` and everything after that at
 * `rateAfterIncluded`.
 */
export function computeDistanceCost(distanceKm: number, config: VehiclePricingConfig): number {
  const chargeableKm = Math.max(0, distanceKm - config.includedKm);
  if (chargeableKm <= 0) return 0;
  const firstKm = Math.min(1, chargeableKm);
  const remainingKm = chargeableKm - firstKm;
  return firstKm * config.rateFirstKm + remainingKm * config.rateAfterIncluded;
}

export function calculateFare(
  distanceKm: number,
  durationMinutes: number,
  vehicleConfig: VehiclePricingConfig,
  productMultiplier: number
): FareBreakdown {
  const distanceCost = computeDistanceCost(distanceKm, vehicleConfig);
  const timeCost = durationMinutes * vehicleConfig.timeRate;
  const subtotal = vehicleConfig.baseFare + distanceCost + timeCost;

  const trafficAdjustment = subtotal * (vehicleConfig.trafficMultiplier - 1);
  const demandAdjustment = subtotal * (vehicleConfig.demandMultiplier - 1);
  const zoneAdjustment = subtotal * (vehicleConfig.zoneMultiplier - 1);

  const standardFare = subtotal + trafficAdjustment + demandAdjustment + zoneAdjustment + vehicleConfig.platformMargin;
  // Round to 6dp before ceiling so float noise (e.g. 87.99999999999999 from
  // repeated multiplication) can't flip a value that should be a clean whole peso.
  const finalFare = Math.ceil(Math.round(standardFare * productMultiplier * 1e6) / 1e6);

  return {
    distanceCost,
    timeCost,
    subtotal,
    trafficAdjustment,
    demandAdjustment,
    zoneAdjustment,
    standardFare,
    finalFare,
  };
}
