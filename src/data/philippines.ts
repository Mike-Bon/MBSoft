import { PH_PROVINCES_FULL } from "./lbcConstants";

// Curated city shortlists for a handful of high-traffic provinces, used only to
// offer a friendly dropdown in the simple AddressFields form (registration, etc).
// Any province not listed here still works fine — AddressFields falls back to a
// free-text City input for it. Not used for rate lookups (see lbcConstants.ts /
// ph-coverage.json for that — those are sourced from LBC's real coverage data).
export const PH_PROVINCES: Record<string, string[]> = {
  "Metro Manila": [
    "Manila",
    "Quezon City",
    "Makati",
    "Taguig",
    "Pasig",
    "Mandaluyong",
    "Pasay",
    "Paranaque",
    "Las Pinas",
    "Muntinlupa",
    "Marikina",
    "Caloocan",
    "Valenzuela",
    "Malabon",
    "Navotas",
    "San Juan",
    "Pateros",
  ],
  Cebu: ["Cebu City", "Mandaue City", "Lapu-Lapu City", "Talisay City", "Toledo City"],
  "Davao Del Sur": ["Davao City", "Digos City", "Sta. Cruz", "Bansalan"],
  Bulacan: ["Malolos", "Meycauayan", "San Jose del Monte", "Baliwag"],
  Iloilo: ["Iloilo City", "Passi City", "Oton", "Pavia"],
  Laguna: ["Santa Rosa", "Calamba", "San Pedro", "Binan"],
  Cavite: ["Bacoor", "Imus", "Dasmarinas", "General Trias"],
  Pampanga: ["San Fernando", "Angeles City", "Mabalacat"],
  "Negros Occidental": ["Bacolod City", "Bago City", "Talisay City"],
  Rizal: ["Antipolo", "Cainta", "Taytay"],
  Batangas: ["Batangas City", "Lipa City", "Tanauan"],
};

/** All 83 real PH provinces (from LBC's own coverage data) — used for the Province
 * select everywhere. Cities are free-text unless the province is one of the
 * curated shortlists above. */
export const PH_PROVINCE_LIST = PH_PROVINCES_FULL;
