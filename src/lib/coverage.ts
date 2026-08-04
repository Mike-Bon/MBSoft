import type { CoverageZone } from "./parcelPricingEngine";

export type CoverageData = Record<string, Record<string, Record<string, CoverageZone>>>;

let coveragePromise: Promise<CoverageData> | null = null;

/** Lazily fetches LBC's real coverage dataset (~680KB, ~190KB gzipped) — only
 * loaded once, the first time a Parcel & Cargo Booking consignee address needs
 * it, not bundled into the main app chunk. */
export function loadCoverage(): Promise<CoverageData> {
  if (!coveragePromise) {
    coveragePromise = fetch("/data/ph-coverage.json").then((res) => {
      if (!res.ok) throw new Error(`Failed to load coverage data (${res.status})`);
      return res.json() as Promise<CoverageData>;
    });
  }
  return coveragePromise;
}

export function getCoverageCities(coverage: CoverageData, province: string): string[] {
  return Object.keys(coverage[province] || {}).sort();
}

export function getCoverageBarangays(coverage: CoverageData, province: string, city: string): string[] {
  return Object.keys(coverage[province]?.[city] || {}).sort();
}

export function getCoverageZone(coverage: CoverageData, province: string, city: string, barangay: string): CoverageZone | undefined {
  return coverage[province]?.[city]?.[barangay];
}
