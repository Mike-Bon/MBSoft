import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import type { Booking, CargoType, Consignee, RecurringShipment, ShipmentStatus, Ticket, TicketStatus } from "../types";

function mapBookingRow(row: Record<string, unknown>): Booking {
  const consignee: Consignee = {
    name: row.consignee_name as string,
    address: {
      province: (row.consignee_province as string) || "",
      city: (row.consignee_city as string) || "",
      barangay: (row.consignee_barangay as string) || "",
      street: (row.consignee_street as string) || "",
      houseNumber: (row.consignee_house_number as string) || "",
      landmark: (row.consignee_landmark as string) || undefined,
      instructions: (row.consignee_instructions as string) || undefined,
    },
    contactNumber: row.consignee_contact as string,
    cargoType: row.cargo_type as CargoType,
  };
  return {
    id: row.id as string,
    userId: row.user_id as string,
    trackingNumber: row.tracking_number as string,
    bookingType: row.booking_type as "parcel" | "on_demand",
    consignee,
    pickupAddress: (row.pickup_address as string) || undefined,
    dropoffAddress: (row.dropoff_address as string) || undefined,
    pickupLat: row.pickup_lat == null ? undefined : Number(row.pickup_lat),
    pickupLng: row.pickup_lng == null ? undefined : Number(row.pickup_lng),
    dropoffLat: row.dropoff_lat == null ? undefined : Number(row.dropoff_lat),
    dropoffLng: row.dropoff_lng == null ? undefined : Number(row.dropoff_lng),
    distanceKm: row.distance_km == null ? undefined : Number(row.distance_km),
    charge: Number(row.charge),
    status: row.status as ShipmentStatus,
    parcelProductSku: (row.parcel_product_sku as string) || undefined,
    createdAt: row.created_at as string,
  };
}

function mapTicketRow(row: Record<string, unknown>): Ticket {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    subject: row.subject as string,
    category: row.category as string,
    description: row.description as string,
    status: row.status as TicketStatus,
    createdAt: row.created_at as string,
  };
}

function mapRecurringRow(row: Record<string, unknown>): RecurringShipment {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    label: row.label as string,
    consignee: {
      name: row.consignee_name as string,
      address: {
        province: (row.address_province as string) || "",
        city: (row.address_city as string) || "",
        barangay: (row.address_barangay as string) || "",
        street: (row.address_street as string) || "",
        houseNumber: (row.address_house_number as string) || "",
      },
      contactNumber: row.contact_number as string,
      cargoType: (row.cargo_type as CargoType) || "standard",
    },
    createdAt: row.created_at as string,
  };
}

interface NewBookingInput {
  trackingNumber: string;
  bookingType: "parcel" | "on_demand";
  consignee: Consignee;
  pickupAddress?: string;
  dropoffAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  distanceKm?: number;
  charge: number;
  status?: ShipmentStatus;
  parcelProductSku?: string;
}

interface DataContextValue {
  bookings: Booking[];
  tickets: Ticket[];
  recurringShipments: RecurringShipment[];
  loading: boolean;
  refreshAll: () => Promise<void>;
  createBooking: (input: NewBookingInput) => Promise<Booking>;
  createBookings: (inputs: NewBookingInput[]) => Promise<Booking[]>;
  createTicket: (subject: string, category: string, description: string) => Promise<void>;
  saveRecurringShipment: (label: string, consignee: Consignee) => Promise<void>;
  deleteRecurringShipment: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [recurringShipments, setRecurringShipments] = useState<RecurringShipment[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshAll = useCallback(async () => {
    if (!profile) {
      setBookings([]);
      setTickets([]);
      setRecurringShipments([]);
      return;
    }
    setLoading(true);
    const [bookingsRes, ticketsRes, recurringRes] = await Promise.all([
      supabase.from("bookings").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }),
      supabase.from("tickets").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }),
      supabase
        .from("recurring_shipments")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false }),
    ]);
    if (bookingsRes.data) setBookings(bookingsRes.data.map(mapBookingRow));
    if (ticketsRes.data) setTickets(ticketsRes.data.map(mapTicketRow));
    if (recurringRes.data) setRecurringShipments(recurringRes.data.map(mapRecurringRow));
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const createBookings = useCallback(
    async (inputs: NewBookingInput[]) => {
      if (!profile) throw new Error("Not signed in");
      const rows = inputs.map((input) => ({
        user_id: profile.id,
        tracking_number: input.trackingNumber,
        booking_type: input.bookingType,
        consignee_name: input.consignee.name,
        consignee_province: input.consignee.address.province,
        consignee_city: input.consignee.address.city,
        consignee_barangay: input.consignee.address.barangay,
        consignee_street: input.consignee.address.street,
        consignee_house_number: input.consignee.address.houseNumber,
        consignee_landmark: input.consignee.address.landmark || null,
        consignee_instructions: input.consignee.address.instructions || null,
        consignee_contact: input.consignee.contactNumber,
        cargo_type: input.consignee.cargoType,
        pickup_address: input.pickupAddress || null,
        dropoff_address: input.dropoffAddress || null,
        pickup_lat: input.pickupLat ?? null,
        pickup_lng: input.pickupLng ?? null,
        dropoff_lat: input.dropoffLat ?? null,
        dropoff_lng: input.dropoffLng ?? null,
        distance_km: input.distanceKm ?? null,
        charge: input.charge,
        status: input.status || "Booked",
        destination_label: `${input.consignee.address.city}, ${input.consignee.address.province}`,
        parcel_product_sku: input.parcelProductSku || null,
      }));
      const { data, error } = await supabase.from("bookings").insert(rows).select("*");
      if (error) throw error;
      const created = (data || []).map(mapBookingRow);
      setBookings((prev) => [...created, ...prev]);
      return created;
    },
    [profile]
  );

  const createBooking = useCallback(
    async (input: NewBookingInput) => {
      const [created] = await createBookings([input]);
      return created;
    },
    [createBookings]
  );

  const createTicket = useCallback(
    async (subject: string, category: string, description: string) => {
      if (!profile) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("tickets")
        .insert({ user_id: profile.id, subject, category, description })
        .select("*")
        .single();
      if (error) throw error;
      setTickets((prev) => [mapTicketRow(data), ...prev]);
    },
    [profile]
  );

  const saveRecurringShipment = useCallback(
    async (label: string, consignee: Consignee) => {
      if (!profile) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("recurring_shipments")
        .insert({
          user_id: profile.id,
          label,
          consignee_name: consignee.name,
          address_province: consignee.address.province,
          address_city: consignee.address.city,
          address_barangay: consignee.address.barangay,
          address_street: consignee.address.street,
          address_house_number: consignee.address.houseNumber,
          contact_number: consignee.contactNumber,
          cargo_type: consignee.cargoType,
        })
        .select("*")
        .single();
      if (error) throw error;
      setRecurringShipments((prev) => [mapRecurringRow(data), ...prev]);
    },
    [profile]
  );

  const deleteRecurringShipment = useCallback(async (id: string) => {
    await supabase.from("recurring_shipments").delete().eq("id", id);
    setRecurringShipments((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      bookings,
      tickets,
      recurringShipments,
      loading,
      refreshAll,
      createBooking,
      createBookings,
      createTicket,
      saveRecurringShipment,
      deleteRecurringShipment,
    }),
    [bookings, tickets, recurringShipments, loading, refreshAll, createBooking, createBookings, createTicket, saveRecurringShipment, deleteRecurringShipment]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
