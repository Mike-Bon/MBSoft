export function formatCurrency(value: number): string {
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Tracking numbers must be globally unique (enforced by a DB constraint) across every
// account, not just within one browser session — a plain per-session counter would
// restart from the same value on every page load and collide across users/sessions.
// Timestamp + a monotonic per-session sequence keeps bulk-insert batches collision-free
// while staying unique across concurrent sessions in practice.
let sequenceCounter = 0;
export function generateTrackingNumber(): string {
  sequenceCounter += 1;
  const sequence = String(sequenceCounter % 1000).padStart(3, "0");
  return `LBC${Date.now()}${sequence}`;
}

const MOBILE_REGEX = /^09\d{9}$/;
export function isValidMobile(value: string): boolean {
  return MOBILE_REGEX.test(value.replace(/\s|-/g, ""));
}

export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
