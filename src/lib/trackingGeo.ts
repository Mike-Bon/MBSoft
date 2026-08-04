import type { Booking, ShipmentStatus, Profile } from "../types";
import { coordinatesForCity } from "../data/cityCoordinates";

export interface LatLng {
  lat: number;
  lng: number;
}

export function getPickupCoord(booking: Booking, profile: Profile | null): LatLng | null {
  if (booking.pickupLat != null && booking.pickupLng != null) {
    return { lat: booking.pickupLat, lng: booking.pickupLng };
  }
  return profile ? coordinatesForCity(profile.address.city) : null;
}

export function getDropoffCoord(booking: Booking): LatLng | null {
  if (booking.dropoffLat != null && booking.dropoffLng != null) {
    return { lat: booking.dropoffLat, lng: booking.dropoffLng };
  }
  return coordinatesForCity(booking.consignee.address.city);
}

/** Fraction along the pickup→dropoff route representing where the parcel likely is, by status. */
export function progressForStatus(status: ShipmentStatus): number {
  switch (status) {
    case "Booked":
      return 0.05;
    case "In Transit":
      return 0.5;
    case "Delayed (SLA)":
      return 0.65;
    case "Tried - No Recipient":
    case "Tried - Refused":
      return 0.92;
    case "Return to Sender":
      return 0.4;
    case "Delivered":
      return 1;
    default:
      return 0.5;
  }
}

export function lerp(a: LatLng, b: LatLng, t: number): LatLng {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}
