import type { ReactNode } from "react";

export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
