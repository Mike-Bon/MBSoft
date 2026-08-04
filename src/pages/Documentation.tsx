import { useMemo, useState } from "react";
import { Search, Download, FileSpreadsheet } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { DataPrivacyFooter } from "../components/DisclaimerNote";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { generatePodPdf, generateManifestPdf, generatePodBatchPdf, downloadPdf } from "../lib/documents";
import { classNames } from "../lib/utils";

type Tab = "pod" | "manifest";

const POD_ELIGIBLE = new Set(["Delivered", "Return to Sender", "Tried - No Recipient", "Tried - Refused"]);

export default function Documentation() {
  const { profile } = useAuth();
  const { bookings } = useData();
  const [tab, setTab] = useState<Tab>("pod");
  const [query, setQuery] = useState("");

  const podRows = useMemo(
    () => bookings.filter((b) => POD_ELIGIBLE.has(b.status)),
    [bookings]
  );

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

  return (
    <div>
      <PageHeader
        title="Documentation"
        subtitle="Proof of Delivery (POD) and Manifest records."
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
        </div>
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-10"
            placeholder="Search tracking or consignee"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {tab === "manifest" && profile && (
          <button
            type="button"
            onClick={() => downloadPdf(generateManifestPdf(filtered, profile), "LBC-Manifest.pdf")}
            className="btn-secondary"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Manifest
          </button>
        )}
      </div>

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

      <DataPrivacyFooter />
    </div>
  );
}
