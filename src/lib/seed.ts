import { supabase } from "./supabase";
import { generateTrackingNumber } from "./utils";
import type { CargoType, ShipmentStatus } from "../types";

interface SeedBooking {
  trackingNumber: string;
  consigneeName: string;
  province: string;
  city: string;
  contact: string;
  cargoType: CargoType;
  charge: number;
  status: ShipmentStatus;
  daysAgo: number;
}

const DEMO_BOOKINGS: SeedBooking[] = [
  {
    trackingNumber: "LBC100000001",
    consigneeName: "Juan Dela Cruz",
    province: "Metro Manila",
    city: "Quezon City",
    contact: "09171234561",
    cargoType: "standard",
    charge: 145,
    status: "Delivered",
    daysAgo: 12,
  },
  {
    trackingNumber: "LBC100000002",
    consigneeName: "Maria Santos",
    province: "Cebu",
    city: "Cebu City",
    contact: "09171234562",
    cargoType: "standard",
    charge: 180,
    status: "Delayed (SLA)",
    daysAgo: 6,
  },
  {
    trackingNumber: "LBC100000003",
    consigneeName: "Pedro Reyes",
    province: "Davao",
    city: "Davao City",
    contact: "09171234563",
    cargoType: "standard",
    charge: 105,
    status: "Tried - No Recipient",
    daysAgo: 3,
  },
  {
    trackingNumber: "LBC100000004",
    consigneeName: "Anna Lim",
    province: "Metro Manila",
    city: "Makati",
    contact: "09171234564",
    cargoType: "on_demand_standard",
    charge: 150,
    status: "Tried - Refused",
    daysAgo: 2,
  },
  {
    trackingNumber: "LBC100000005",
    consigneeName: "Jose Ramos",
    province: "Iloilo",
    city: "Iloilo City",
    contact: "09171234565",
    cargoType: "standard",
    charge: 190,
    status: "Return to Sender",
    daysAgo: 9,
  },
  {
    trackingNumber: "LBC100000006",
    consigneeName: "Liza Cruz",
    province: "Metro Manila",
    city: "Manila",
    contact: "09171234566",
    cargoType: "standard",
    charge: 155,
    status: "Delivered",
    daysAgo: 5,
  },
  {
    trackingNumber: "LBC100000007",
    consigneeName: "Mark Villanueva",
    province: "Bulacan",
    city: "Malolos",
    contact: "09171234567",
    cargoType: "on_demand_medical",
    charge: 205,
    status: "In Transit",
    daysAgo: 1,
  },
  {
    trackingNumber: "LBC100000008",
    consigneeName: "Carmela Ong",
    province: "Laguna",
    city: "Santa Rosa",
    contact: "09171234568",
    cargoType: "standard",
    charge: 165,
    status: "Booked",
    daysAgo: 0,
  },
];

/** Seeds a handful of demo shipments for a brand-new account so the dashboard,
 * shipments, tracking and documentation screens aren't empty on first login. */
export async function seedDemoDataForUser(userId: string) {
  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (count && count > 0) return;

  const rows = DEMO_BOOKINGS.map((b) => {
    const created = new Date();
    created.setDate(created.getDate() - b.daysAgo);
    return {
      user_id: userId,
      tracking_number: generateTrackingNumber(),
      booking_type: b.cargoType === "standard" ? "parcel" : "on_demand",
      consignee_name: b.consigneeName,
      consignee_province: b.province,
      consignee_city: b.city,
      consignee_barangay: "Poblacion",
      consignee_street: "Sample St.",
      consignee_house_number: "12",
      consignee_contact: b.contact,
      cargo_type: b.cargoType,
      dropoff_address: `${b.city}, ${b.province}`,
      distance_km: b.cargoType === "standard" ? null : Math.round(Math.random() * 12 + 3),
      charge: b.charge,
      status: b.status,
      destination_label: `${b.city}, ${b.province}`,
      created_at: created.toISOString(),
    };
  });

  await supabase.from("bookings").insert(rows);
}
