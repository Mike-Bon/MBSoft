import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import TrackingMap from "../components/TrackingMap";
import { useData } from "../context/DataContext";
import { classNames, formatDateTime } from "../lib/utils";

export default function Tracking() {
  const { bookings } = useData();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => bookings.filter((b) => !query || b.trackingNumber.toLowerCase().includes(query.toLowerCase())),
    [bookings, query]
  );

  useEffect(() => {
    const trackingParam = searchParams.get("tracking");
    if (trackingParam) {
      const match = bookings.find((b) => b.trackingNumber === trackingParam);
      if (match) setSelectedId(match.id);
    } else if (!selectedId && bookings.length > 0) {
      setSelectedId(bookings[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, bookings]);

  const selected = bookings.find((b) => b.id === selectedId) || null;

  return (
    <div>
      <PageHeader title="Live Tracking" subtitle="Real-time shipment location and status." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
        <div className="flex max-h-[640px] flex-col overflow-hidden rounded-2xl border border-lbc-border bg-white shadow-sm">
          <div className="border-b border-lbc-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Search tracking number"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className={classNames(
                  "flex w-full flex-col gap-1 border-b border-lbc-border px-4 py-3 text-left transition",
                  selectedId === b.id ? "bg-lbc-red-light" : "hover:bg-lbc-bg"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-gray-900">{b.trackingNumber}</span>
                  <StatusBadge status={b.status} />
                </div>
                <span className="text-xs text-gray-500">
                  {b.consignee.name} · {b.consignee.address.city}
                </span>
              </button>
            ))}
            {filtered.length === 0 && <p className="p-4 text-center text-sm text-gray-400">No shipments found.</p>}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="h-[420px] overflow-hidden rounded-2xl border border-lbc-border bg-white shadow-sm">
            {selected ? <TrackingMap booking={selected} /> : <div className="flex h-full items-center justify-center text-gray-400">Select a shipment</div>}
          </div>

          {selected && (
            <div className="card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-lg font-bold text-gray-900">{selected.trackingNumber}</p>
                  <p className="text-sm text-gray-500">
                    To {selected.consignee.name} · {selected.consignee.address.city}, {selected.consignee.address.province}
                  </p>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <InfoItem label="Cargo Type" value={selected.consignee.cargoType} />
                <InfoItem label="Charge" value={`₱${selected.charge.toFixed(2)}`} />
                <InfoItem label="Booked" value={formatDateTime(selected.createdAt)} />
                <InfoItem label="Contact" value={selected.consignee.contactNumber} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 font-medium text-gray-800">{value}</p>
    </div>
  );
}
