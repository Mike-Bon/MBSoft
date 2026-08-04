import { supabase } from "./supabase";
import type { Booking, Invoice, Profile } from "../types";

const VAT_RATE = 0.12;
const WITHHOLDING_RATE = 0.02;

/** MCEB + 2-digit month + 4-digit year + 8-digit global sequence, e.g. MCEB07202600000001 */
export function formatInvoiceNumber(month: number, year: number, sequence: number): string {
  return `MCEB${String(month).padStart(2, "0")}${year}${String(sequence).padStart(8, "0")}`;
}

export interface InvoiceTotals {
  totalSales: number;
  vat: number;
  vatableSales: number;
  withholdingTax: number;
  totalAmountDue: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** VAT breakdown matching the LBC billing invoice format: charges are VAT-inclusive,
 * 12% VAT is backed out, then a 2% expanded withholding tax is deducted to arrive at
 * the total amount due. */
export function computeInvoiceTotals(charges: number[]): InvoiceTotals {
  const totalSales = round2(charges.reduce((sum, c) => sum + c, 0));
  const vat = round2(totalSales * (VAT_RATE / (1 + VAT_RATE)));
  const vatableSales = round2(totalSales - vat);
  const withholdingTax = round2(vatableSales * WITHHOLDING_RATE);
  const totalAmountDue = round2(totalSales - withholdingTax);
  return { totalSales, vat, vatableSales, withholdingTax, totalAmountDue };
}

function mapInvoiceRow(row: Record<string, unknown>): Invoice {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    invoiceNumber: row.invoice_number as string,
    periodMonth: Number(row.period_month),
    periodYear: Number(row.period_year),
    totalSales: Number(row.total_sales),
    vat: Number(row.vat),
    vatableSales: Number(row.vatable_sales),
    withholdingTax: Number(row.withholding_tax),
    totalAmountDue: Number(row.total_amount_due),
    bookingCount: Number(row.booking_count),
    createdAt: row.created_at as string,
  };
}

async function createInvoiceForMonth(userId: string, month: number, year: number, bookings: Booking[]) {
  const totals = computeInvoiceTotals(bookings.map((b) => b.charge));
  const { data: seqData, error: seqError } = await supabase.rpc("next_invoice_sequence");
  if (seqError || seqData == null) return;

  const invoiceNumber = formatInvoiceNumber(month, year, Number(seqData));
  await supabase.from("invoices").insert({
    user_id: userId,
    invoice_number: invoiceNumber,
    period_month: month,
    period_year: year,
    total_sales: totals.totalSales,
    vat: totals.vat,
    vatable_sales: totals.vatableSales,
    withholding_tax: totals.withholdingTax,
    total_amount_due: totals.totalAmountDue,
    booking_count: bookings.length,
  });
}

/**
 * Ensures an invoice exists for every fully-elapsed calendar month (since the
 * account was created) that had at least one booking. There's no server-side cron
 * in this app, so instead of generating strictly "on the 1st of the month", this
 * lazily backfills any missing past-month invoice the first time a charge account
 * opens the Billing Invoice tab after that month has closed — same end result.
 */
export async function ensureMonthlyInvoices(profile: Profile, bookings: Booking[]): Promise<void> {
  if (profile.accountType !== "charge") return;

  const { data: existing } = await supabase
    .from("invoices")
    .select("period_month, period_year")
    .eq("user_id", profile.id);
  const existingKeys = new Set((existing || []).map((r) => `${r.period_year}-${r.period_month}`));

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Group bookings by calendar month rather than assuming a continuous range from
  // profile.createdAt — only elapsed months that actually have bookings get billed.
  const byMonth = new Map<string, Booking[]>();
  for (const b of bookings) {
    const d = new Date(b.createdAt);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    if (monthStart >= currentMonthStart) continue; // current month hasn't elapsed yet
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const list = byMonth.get(key) || [];
    list.push(b);
    byMonth.set(key, list);
  }

  for (const [key, monthBookings] of byMonth) {
    if (existingKeys.has(key)) continue;
    const [year, month] = key.split("-").map(Number);
    await createInvoiceForMonth(profile.id, month, year, monthBookings);
  }
}

export async function fetchInvoices(userId: string): Promise<Invoice[]> {
  const { data } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", userId)
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });
  return (data || []).map(mapInvoiceRow);
}
