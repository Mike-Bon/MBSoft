import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Printer, Download, MapPin, FileSpreadsheet, Search } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { formatCurrency } from "../lib/utils";
import { generateLabelPdf, generateSummarySheetPdf, printPdf, downloadPdf } from "../lib/documents";
import type { ShipmentStatus } from "../types";

const ALL_STATUSES: ShipmentStatus[] = [
  "Booked",
  "In Transit",
  "Delivered",
  "Delayed (SLA)",
  "Tried - No Recipient",
  "Tried - Refused",
  "Return to Sender",
];

export default function Shipments() {
  const { profile } = useAuth();
  const { bookings } = useData();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("All status");

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const matchesQuery =
        !query ||
        b.trackingNumber.toLowerCase().includes(query.toLowerCase()) ||
        b.consignee.name.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = status === "All status" || b.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [bookings, query, status]);

  return (
    <div>
      <PageHeader
        title="Shipments"
        subtitle={`${bookings.length} shipment(s)`}
        action={
          profile && (
            <button
              type="button"
              onClick={() => downloadPdf(generateSummarySheetPdf(filtered, profile), "LBC-Summary-Sheet.pdf")}
              className="btn-primary"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Summary Sheet
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-10"
            placeholder="Search tracking, consignee, or booking ref"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option>All status</option>
          {ALL_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-lbc-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-lbc-bg text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">Tracking</th>
                <th className="px-5 py-3">Consignee</th>
                <th className="px-5 py-3">Destination</th>
                <th className="px-5 py-3">Charge</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
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
                  <td className="px-5 py-4 font-semibold text-gray-900">{formatCurrency(b.charge)}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1.5">
                      <IconButton
                        title="Print label"
                        onClick={() => profile && printPdf(generateLabelPdf(b, profile))}
                        icon={Printer}
                      />
                      <IconButton
                        title="Download label"
                        onClick={() => profile && downloadPdf(generateLabelPdf(b, profile), `${b.trackingNumber}.pdf`)}
                        icon={Download}
                      />
                      <IconButton title="Track on map" onClick={() => navigate(`/tracking?tracking=${b.trackingNumber}`)} icon={MapPin} />
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                    No shipments match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function IconButton({ title, onClick, icon: Icon }: { title: string; onClick: () => void; icon: typeof Printer }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-lbc-border text-gray-500 transition hover:border-lbc-red hover:text-lbc-red"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
