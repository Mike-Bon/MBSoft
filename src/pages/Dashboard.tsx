import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Calendar, TrendingUp, PackageCheck, Clock3 } from "lucide-react";
import { useData } from "../context/DataContext";
import PageHeader from "../components/PageHeader";
import type { ShipmentStatus } from "../types";

const STATUS_BUCKETS: { key: ShipmentStatus; label: string; color: string }[] = [
  { key: "Delivered", label: "Delivered", color: "#059669" },
  { key: "Delayed (SLA)", label: "Delays (SLA)", color: "#f97316" },
  { key: "Tried - No Recipient", label: "Tried – No Recipient", color: "#eab308" },
  { key: "Tried - Refused", label: "Tried – Refused", color: "#e11d48" },
  { key: "Return to Sender", label: "Return to Sender (RTS)", color: "#dc2626" },
];

export default function Dashboard() {
  const { bookings } = useData();

  const stats = useMemo(() => {
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const month = 30 * 24 * 60 * 60 * 1000;
    const weekly = bookings.filter((b) => now - new Date(b.createdAt).getTime() <= week).length;
    const monthly = bookings.filter((b) => now - new Date(b.createdAt).getTime() <= month).length;
    const delivered = bookings.filter((b) => b.status === "Delivered").length;
    const delayed = bookings.filter((b) => b.status === "Delayed (SLA)").length;
    return { weekly, monthly, delivered, delayed };
  }, [bookings]);

  const chartData = useMemo(
    () =>
      STATUS_BUCKETS.map((bucket) => ({
        name: bucket.label,
        value: bookings.filter((b) => b.status === bucket.key).length,
        color: bucket.color,
      })),
    [bookings]
  );

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Shipment volume and delivery performance overview." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Calendar} label="Weekly Volume" value={stats.weekly} iconClass="bg-blue-50 text-blue-600" />
        <StatCard icon={TrendingUp} label="Monthly Volume" value={stats.monthly} iconClass="bg-purple-50 text-purple-600" />
        <StatCard icon={PackageCheck} label="Delivered" value={stats.delivered} iconClass="bg-emerald-50 text-emerald-600" />
        <StatCard icon={Clock3} label="Delays (SLA)" value={stats.delayed} iconClass="bg-orange-50 text-orange-600" />
      </div>

      <div className="card mt-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Delivery Status Breakdown</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip cursor={{ fill: "rgba(208,2,27,0.05)" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  iconClass,
}: {
  icon: typeof Calendar;
  label: string;
  value: number;
  iconClass: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-extrabold text-gray-900">{value}</p>
    </div>
  );
}
