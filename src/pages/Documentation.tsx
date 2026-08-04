import { useEffect, useMemo, useState } from "react";
import { Search, Download, FileSpreadsheet, Receipt, Loader2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { DataPrivacyFooter } from "../components/DisclaimerNote";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import {
  generatePodPdf,
  generateManifestPdf,
  generatePodBatchPdf,
  generateBillingInvoicePdf,
  downloadPdf,
} from "../lib/documents";
import { ensureMonthlyInvoices, fetchInvoices } from "../lib/invoices";
import { classNames, formatCurrency, formatDateTime } from "../lib/utils";
import type { Invoice } from "../types";

type Tab = "pod" | "manifest" | "billing";

const POD_ELIGIBLE = new Set(["Delivered", "Return to Sender", "Tried - No Recipient", "Tried - Refused"]);

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function Documentation() {
  const { profile } = useAuth();
  const { bookings } = useData();
  const [tab, setTab] = useState<Tab>("pod");
  const [query, setQuery] = useState("");
  const [manifestMonth, setManifestMonth] = useState(currentMonthValue());

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const isChargeAccount = profile?.accountType === "charge";

  useEffect(() => {
    if (tab !== "billing" || !profile || !isChargeAccount) return;
    let cancelled = false;
    setInvoicesLoading(true);
    ensureMonthlyInvoices(profile, bookings)
      .then(() => fetchInvoices(profile.id))
      .then((rows) => {
        if (!cancelled) setInvoices(rows);
      })
      .finally(() => {
        if (!cancelled) setInvoicesLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, profile?.id]);

  const podRows = useMemo(() => bookings.filter((b) => POD_ELIGIBLE.has(b.status)), [bookings]);

  const rows = tab === "pod" ? podRows : bookings;
  const filtered = useMemo(
    () =>
      rows.filter(
        (b) =>
          !query ||
          b.trackingNumber.toLowerCase().includes(query.toLowerCase()) ||
          b.consignee.name.toLowerCase().includes(query.toLowerCase())
      ),
    [rows, query]
  );

  const [manifestYear, manifestMonthNum] = manifestMonth.split("-").map(Number);
  const monthlyManifestBookings = useMemo(
    () =>
      bookings.filter((b) => {
        const d = new Date(b.createdAt);
        return d.getFullYear() === manifestYear && d.getMonth() + 1 === manifestMonthNum;
      }),
    [bookings, manifestYear, manifestMonthNum]
  );

  return (
    <div>
      <PageHeader
        title="Documentation"
        subtitle="Proof of Delivery (POD), Manifest, and Billing records."
        action={
          tab === "pod" &&
          profile && (
            <button
              type="button"
              onClick={() => downloadPdf(generatePodBatchPdf(podRows, profile), "LBC-POD-Batch.pdf")}
              className="btn-primary"
            >
              <Download className="h-4 w-4" />
              Download POD Batch
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex gap-1 rounded-xl bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setTab("pod")}
            className={classNames(
              "rounded-lg px-4 py-2 text-sm font-semibold transition",
              tab === "pod" ? "bg-lbc-red text-white" : "text-gray-600 hover:bg-lbc-bg"
            )}
          >
            POD
          </button>
          <button
            type="button"
            onClick={() => setTab("manifest")}
            className={classNames(
              "rounded-lg px-4 py-2 text-sm font-semibold transition",
              tab === "manifest" ? "bg-lbc-red text-white" : "text-gray-600 hover:bg-lbc-bg"
            )}
          >
            Manifest
          </button>
          {isChargeAccount && (
            <button
              type="button"
              onClick={() => setTab("billing")}
              className={classNames(
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                tab === "billing" ? "bg-lbc-red text-white" : "text-gray-600 hover:bg-lbc-bg"
              )}
            >
              Billing Invoice
            </button>
          )}
        </div>

        {tab !== "billing" && (
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-10"
              placeholder="Search tracking or consignee"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        )}

        {tab === "manifest" && profile && (
          <>
            <input
              type="month"
              className="input max-w-[160px]"
              value={manifestMonth}
              onChange={(e) => setManifestMonth(e.target.value)}
            />
            <button
              type="button"
              onClick={() =>
                downloadPdf(
                  generateManifestPdf(monthlyManifestBookings, profile),
                  `LBC-Manifest-${manifestMonth}.pdf`
                )
              }
              className="btn-secondary"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Monthly Manifest ({monthlyManifestBookings.length})
            </button>
          </>
        )}
      </div>

      {tab === "billing" ? (
        <BillingInvoiceTab invoices={invoices} loading={invoicesLoading} bookings={bookings} profile={profile} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-lbc-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-lbc-bg text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Tracking</th>
                  <th className="px-5 py-3">Consignee</th>
                  <th className="px-5 py-3">Destination</th>
                  <th className="px-5 py-3">Status</th>
                  {tab === "pod" && <th className="px-5 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-t border-lbc-border">
                    <td className="px-5 py-4 font-mono text-sm font-semibold text-gray-900">{b.trackingNumber}</td>
                    <td className="px-5 py-4 text-gray-700">{b.consignee.name}</td>
                    <td className="px-5 py-4 text-gray-500">
                      {b.consignee.address.city}, {b.consignee.address.province}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={b.status} />
                    </td>
                    {tab === "pod" && (
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => profile && downloadPdf(generatePodPdf(b, profile), `POD-${b.trackingNumber}.pdf`)}
                          className="btn-secondary !px-3 !py-1.5 text-xs"
                        >
                          <Download className="h-3.5 w-3.5" />
                          POD
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DataPrivacyFooter />
    </div>
  );
}

function BillingInvoiceTab({
  invoices,
  loading,
  bookings,
  profile,
}: {
  invoices: Invoice[];
  loading: boolean;
  bookings: import("../types").Booking[];
  profile: import("../types").Profile | null;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-lbc-border bg-white py-16 text-gray-400 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin" />
        Preparing your billing invoices…
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-lbc-border bg-white py-16 text-center shadow-sm">
        <Receipt className="h-8 w-8 text-gray-300" />
        <p className="text-gray-400">
          No billing invoices yet. One is generated automatically on the 1st of each month for all shipments booked
          the month before.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-lbc-border bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-lbc-bg text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-5 py-3">Invoice No.</th>
            <th className="px-5 py-3">Billing Period</th>
            <th className="px-5 py-3">Shipments</th>
            <th className="px-5 py-3">Total Amount Due</th>
            <th className="px-5 py-3">Generated</th>
            <th className="px-5 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-t border-lbc-border">
              <td className="px-5 py-4 font-mono text-sm font-semibold text-gray-900">{inv.invoiceNumber}</td>
              <td className="px-5 py-4 text-gray-700">
                {MONTH_NAMES[inv.periodMonth - 1]} {inv.periodYear}
              </td>
              <td className="px-5 py-4 text-gray-500">{inv.bookingCount}</td>
              <td className="px-5 py-4 font-semibold text-gray-900">{formatCurrency(inv.totalAmountDue)}</td>
              <td className="px-5 py-4 text-gray-500">{formatDateTime(inv.createdAt)}</td>
              <td className="px-5 py-4 text-right">
                <button
                  type="button"
                  onClick={() => {
                    if (!profile) return;
                    const periodBookings = bookings.filter((b) => {
                      const d = new Date(b.createdAt);
                      return d.getFullYear() === inv.periodYear && d.getMonth() + 1 === inv.periodMonth;
                    });
                    downloadPdf(generateBillingInvoicePdf(inv, periodBookings, profile), `${inv.invoiceNumber}.pdf`);
                  }}
                  className="btn-secondary !px-3 !py-1.5 text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
