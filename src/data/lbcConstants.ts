// Reference data for LBC's real "Traditional" channel parcel rate book, sourced
// from LBC Coverage.xlsx (province -> main region, derived from the MAIN REGION
// column) and business_rules.md (product catalog, island overrides, box fees,
// weight limits — see LBC Portal /anthropic-skills:lbccalc skill).

export type MainRegion = "NCR" | "NLA" | "SLA" | "VIS" | "MIN";
export type RateBucket = MainRegion | "ISLAND";

/** All 83 PH provinces mapped to their LBC operational main region. */
export const PROV_MAIN_REGION: Record<string, MainRegion> = {
  "Metro Manila": "NCR",
  Rizal: "NCR",
  Palawan: "SLA",
  Cagayan: "NLA",
  Isabela: "NLA",
  Quirino: "NLA",
  "Nueva Vizcaya": "NLA",
  Ifugao: "NLA",
  "Mountain Province": "NLA",
  "Negros Occidental": "VIS",
  "La Union": "NLA",
  Benguet: "NLA",
  Bohol: "VIS",
  Cebu: "VIS",
  Bulacan: "NLA",
  "Zamboanga Del Norte": "MIN",
  "Zamboanga Sibugay": "MIN",
  "Zamboanga Del Sur": "MIN",
  "Lanao Del Sur": "MIN",
  "Lanao Del Norte": "MIN",
  "Misamis Occidental": "MIN",
  "Misamis Oriental": "MIN",
  Basilan: "MIN",
  "Tawi-Tawi": "MIN",
  Sulu: "MIN",
  "Maguindanao Del Sur": "MIN",
  Sarangani: "MIN",
  "North Cotabato": "MIN",
  "Sultan Kudarat": "MIN",
  "South Cotabato": "MIN",
  "Davao Del Sur": "MIN",
  "Davao Occidental": "MIN",
  "Occidental Mindoro": "SLA",
  Romblon: "SLA",
  "Oriental Mindoro": "SLA",
  Leyte: "VIS",
  "Northern Samar": "VIS",
  Samar: "VIS",
  Biliran: "VIS",
  "Southern Leyte": "VIS",
  "Eastern Samar": "VIS",
  Pangasinan: "NLA",
  Pampanga: "NLA",
  Masbate: "SLA",
  Sorsogon: "SLA",
  Catanduanes: "SLA",
  Albay: "SLA",
  "Negros Oriental": "VIS",
  Siquijor: "VIS",
  "Ilocos Sur": "NLA",
  "Ilocos Norte": "NLA",
  Abra: "NLA",
  Batangas: "SLA",
  "Maguindanao Del Norte": "MIN",
  Quezon: "SLA",
  Marinduque: "SLA",
  Bukidnon: "MIN",
  Camiguin: "MIN",
  Antique: "VIS",
  Aklan: "VIS",
  Capiz: "VIS",
  Iloilo: "VIS",
  Guimaras: "VIS",
  Batanes: "NLA",
  Kalinga: "NLA",
  Apayao: "NLA",
  Laguna: "SLA",
  "Camarines Sur": "SLA",
  "Camarines Norte": "SLA",
  "Davao Del Norte": "MIN",
  "Davao Oriental": "MIN",
  "Davao De Oro": "MIN",
  "Agusan Del Sur": "MIN",
  "Agusan Del Norte": "MIN",
  "Surigao Del Norte": "MIN",
  "Surigao Del Sur": "MIN",
  "Dinagat Islands": "MIN",
  Bataan: "NLA",
  Zambales: "NLA",
  Aurora: "NLA",
  "Nueva Ecija": "NLA",
  Tarlac: "NLA",
  Cavite: "SLA",
};

export const PH_PROVINCES_FULL: string[] = Object.keys(PROV_MAIN_REGION).sort();

/** Whole provinces that are always rate-bucketed as ISLAND regardless of city. */
export const ISLAND_WHOLE_PROVINCES = new Set([
  "Batanes",
  "Romblon",
  "Marinduque",
  "Oriental Mindoro",
  "Occidental Mindoro",
  "Masbate",
  "Catanduanes",
  "Siquijor",
  "Guimaras",
  "Camiguin",
  "Sulu",
  "Basilan",
  "Tawi-Tawi",
  "Dinagat Islands",
]);

/** Otherwise-mainland provinces where only specific cities are ISLAND-rated. */
export const ISLAND_PARTIAL_CITIES: Record<string, Set<string>> = {
  Palawan: new Set(["Coron"]),
  Cebu: new Set(["Bantayan", "Poro", "San Francisco", "Tudela"]),
  "Surigao Del Norte": new Set([
    "Burgos",
    "Dapa",
    "Del Carmen",
    "General Luna",
    "Pilar",
    "San Benito",
    "San Isidro",
    "Santa Monica",
  ]),
};

export function isIslandCity(province: string, city: string): boolean {
  if (ISLAND_WHOLE_PROVINCES.has(province)) return true;
  if (ISLAND_PARTIAL_CITIES[province]?.has(city)) return true;
  if (/ISLAND/i.test(city)) return true;
  return false;
}

export function isIslandBarangay(city: string, barangay: string): boolean {
  return /ISLAND/i.test(city) || /ISLAND/i.test(barangay);
}

// ---------------------------------------------------------------------------
// Product catalog (Traditional channel)
// ---------------------------------------------------------------------------

export type ParcelProductKey =
  | "np_reg"
  | "np_xl"
  | "np_ss"
  | "vpouch"
  | "np_small"
  | "np_medium"
  | "np_large"
  | "kb_mini"
  | "kb_small"
  | "kb_slim"
  | "kb_medium"
  | "kb_large"
  | "kb_xl"
  | "gen_cargo";

export const PRODUCT_LABEL: Record<ParcelProductKey, string> = {
  np_reg: "NP Regular (Envelope, 1kg limit)",
  np_xl: "NP XL (A4, 3kg limit)",
  np_ss: "NP SS (A3, 3kg limit)",
  vpouch: "V-Pouch (A4, 1kg limit)",
  np_small: "NP Small (0.5kg limit)",
  np_medium: "NP Medium (1kg limit)",
  np_large: "NP Large (3kg limit)",
  kb_mini: "KB Mini (1kg limit)",
  kb_small: "KB Small (3kg limit)",
  kb_slim: "KB Slim (3kg limit)",
  kb_medium: "KB Medium (5kg limit)",
  kb_large: "KB Large (10kg limit)",
  kb_xl: "KB XL (19kg limit)",
  gen_cargo: "General Cargo (own packaging)",
};

/** Fixed-SKU products' weight ceiling in kg — not applicable to gen_cargo. */
export const PRODUCT_WEIGHT_LIMIT: Partial<Record<ParcelProductKey, number>> = {
  np_reg: 1,
  np_xl: 3,
  np_ss: 3,
  vpouch: 1,
  np_small: 0.5,
  np_medium: 1,
  np_large: 3,
  kb_mini: 1,
  kb_small: 3,
  kb_slim: 3,
  kb_medium: 5,
  kb_large: 10,
  kb_xl: 19,
};

export const GEN_CARGO_WEIGHT_LIMIT_KG = 100;
export const GEN_CARGO_VOLUME_LIMIT_CM3 = 1_000_000; // 1 CBM

/** Exempt from Valuation/Insurance fee. */
export const DOC_KEYS = new Set<ParcelProductKey>(["np_reg", "np_xl", "np_ss"]);

/** Get a flat Box Fee line (retail only). */
export const KB_KEYS = new Set<ParcelProductKey>(["kb_mini", "kb_small", "kb_slim", "kb_medium", "kb_large", "kb_xl"]);

export const BOX_FEE: Partial<Record<ParcelProductKey, number>> = {
  kb_mini: 15,
  kb_small: 20,
  kb_slim: 20,
  kb_medium: 20,
  kb_large: 35,
  kb_xl: 60,
};
