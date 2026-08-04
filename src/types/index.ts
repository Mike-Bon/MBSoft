export type AccountKind = "business" | "individual";
export type AccountType = "charge" | "cash";
export type CargoType = "standard" | "on_demand_standard" | "on_demand_medical";
export type ShipmentStatus =
  | "Booked"
  | "In Transit"
  | "Delivered"
  | "Delayed (SLA)"
  | "Tried - No Recipient"
  | "Tried - Refused"
  | "Return to Sender";

export interface Address {
  province: string;
  city: string;
  barangay: string;
  street: string;
  houseNumber: string;
  landmark?: string;
  instructions?: string;
}

export interface Profile {
  id: string;
  accountKind: AccountKind;
  name: string;
  address: Address;
  tinNumber?: string;
  accountType: AccountType;
  authorizedRepresentative?: string;
  idType: string;
  idDocumentUrl?: string;
  email: string;
  contactNumber: string;
  createdAt: string;
}

export interface Consignee {
  name: string;
  address: Address;
  contactNumber: string;
  cargoType: CargoType;
}

export interface Booking {
  id: string;
  userId: string;
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
  status: ShipmentStatus;
  createdAt: string;
}

export interface RecurringShipment {
  id: string;
  userId: string;
  label: string;
  consignee: Consignee;
  createdAt: string;
}

export type TicketStatus = "Open" | "In Progress" | "Resolved";

export interface Ticket {
  id: string;
  userId: string;
  subject: string;
  category: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
}

export interface PricingConfig {
  id: string;
  productType: "standard" | "medical";
  baseFare: number;
  perKm: number;
  minFare: number;
}

export interface Vehicle {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export interface ProductType {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export interface Invoice {
  id: string;
  userId: string;
  invoiceNumber: string;
  periodMonth: number;
  periodYear: number;
  totalSales: number;
  vat: number;
  vatableSales: number;
  withholdingTax: number;
  totalAmountDue: number;
  bookingCount: number;
  createdAt: string;
}
