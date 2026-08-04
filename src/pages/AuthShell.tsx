import type { ReactNode } from "react";
import { Truck } from "lucide-react";

export default function AuthShell({
  title,
  subtitle,
  children,
  wide,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-lbc-bg px-4 py-10">
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-lbc-red shadow-md">
            <Truck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">LBC Express</h1>
          <p className="text-xs font-semibold tracking-wider text-gray-400">BOOKING PORTAL</p>
        </div>
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-xs text-gray-400">
          All information is secured in compliance with the Data Privacy Act of 2012.
        </p>
      </div>
    </div>
  );
}
