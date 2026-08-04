import type { ShipmentStatus, TicketStatus } from "../types";
import { classNames } from "../lib/utils";

const STATUS_STYLES: Record<string, string> = {
  Delivered: "bg-emerald-100 text-emerald-700",
  "In Transit": "bg-amber-100 text-amber-700",
  Booked: "bg-blue-100 text-blue-700",
  "Delayed (SLA)": "bg-orange-100 text-orange-700",
  "Tried - No Recipient": "bg-yellow-100 text-yellow-700",
  "Tried - Refused": "bg-rose-100 text-rose-700",
  "Return to Sender": "bg-red-100 text-red-700",
  Open: "bg-blue-100 text-blue-700",
  "In Progress": "bg-amber-100 text-amber-700",
  Resolved: "bg-emerald-100 text-emerald-700",
};

export default function StatusBadge({ status }: { status: ShipmentStatus | TicketStatus }) {
  return (
    <span
      className={classNames(
        "inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold",
        STATUS_STYLES[status] || "bg-gray-100 text-gray-700"
      )}
    >
      {status}
    </span>
  );
}
