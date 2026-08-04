/**
 * LBC "Traditional" channel parcel rate engine — real published rates (April 2026),
 * ported from the /anthropic-skills:lbccalc skill's business_rules.md. Pure,
 * config-driven business logic, no UI/network — mirrors the on-demand
 * pricingEngine.ts's separation of concerns.
 *
 * Rush delivery and ODZ/NSA branch-pickup fallback are intentionally out of scope
 * (see plan): an unserviceable destination is reported via `serviceable: false`
 * rather than offering a pickup-branch alternative.
 */
import parcelRatesData from "../data/parcelRates.json";
import {
  BOX_FEE,
  DOC_KEYS,
  GEN_CARGO_VOLUME_LIMIT_CM3,
  GEN_CARGO_WEIGHT_LIMIT_KG,
  KB_KEYS,
  PROV_MAIN_REGION,
  PRODUCT_WEIGHT_LIMIT,
  isIslandCity,
  type MainRegion,
  type ParcelProductKey,
  type RateBucket,
} from "../data/lbcConstants";

type DestKey = "NCR" | "NLA" | "SLA" | "VIS" | "MIN" | "ISLANDER" | "INTRA_PROVINCE";

interface ParcelRateRow {
  np_reg: number;
  np_xl: number;
  np_ss: number;
  vpouch: number;
  np_small: number;
  np_medium: number;
  np_large: number;
  kb_mini: number;
  kb_small: number;
  kb_slim: number;
  kb_medium: number;
  kb_large: number;
  kb_xl: number;
  gen_cargo: [number, number]; // [minCharge, perKgRate]
}

type ParcelRatesData = Partial<Record<RateBucket, Partial<Record<DestKey, ParcelRateRow>>>>;

const RATES = parcelRatesData as unknown as ParcelRatesData;

export type CoverageZone = "S" | "O" | "N";

export function resolveRateBucket(province: string, city?: string): RateBucket {
  if (city && isIslandCity(province, city)) return "ISLAND";
  return PROV_MAIN_REGION[province] || "NLA";
}

export function resolveMainRegion(province: string): MainRegion {
  return PROV_MAIN_REGION[province] || "NLA";
}

function isIntraProvince2026(originProvince: string, originBucket: RateBucket, destProvince: string): boolean {
  const originMainRegion = PROV_MAIN_REGION[originProvince];
  const eligible = originBucket === "VIS" || (originBucket === "ISLAND" && (originMainRegion === "VIS" || originMainRegion === "MIN"));
  if (!eligible || !destProvince) return false;
  return originProvince === destProvince;
}

export function retailDestKey2026(
  originProvince: string,
  originBucket: RateBucket,
  destProvince: string,
  destBucket: RateBucket,
  destMainRegion: MainRegion
): DestKey | null {
  if (isIntraProvince2026(originProvince, originBucket, destProvince)) return "INTRA_PROVINCE";
  if (destBucket === "ISLAND") return "ISLANDER";
  if (destMainRegion === "NCR") return "NCR";
  if (destMainRegion === "NLA") return "NLA";
  if (destMainRegion === "SLA") return "SLA";
  if (destMainRegion === "VIS") return "VIS";
  if (destMainRegion === "MIN") return "MIN";
  return null;
}

function insuranceFee(declaredValue: number | undefined): number {
  if (!declaredValue || declaredValue < 500) return 0;
  return 15 + Math.ceil(Math.max(0, declaredValue - 500) / 500) * 5;
}

export interface ParcelFareInput {
  product: ParcelProductKey;
  originProvince: string;
  originCity?: string;
  destProvince: string;
  destCity: string;
  destBarangay: string;
  /** Resolved separately via the coverage dataset (see lib/coverage.ts) — this
   * engine is pure and doesn't do the lookup itself. */
  destZone: CoverageZone;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  declaredValue?: number;
}

export interface ParcelFareBreakdown {
  serviceable: boolean;
  blockReason?: string;
  freight: number;
  insurance: number;
  boxFee: number;
  surcharge: number;
  vat: number;
  /** The only number the customer should see — everything above is kept for
   * potential future admin/invoice use. */
  finalFare: number;
  chargeableWeightKg?: number;
}

const BLOCKED: Omit<ParcelFareBreakdown, "serviceable" | "blockReason"> = {
  freight: 0,
  insurance: 0,
  boxFee: 0,
  surcharge: 0,
  vat: 0,
  finalFare: 0,
};

export function computeParcelFare(input: ParcelFareInput): ParcelFareBreakdown {
  if (input.destZone !== "S") {
    return {
      serviceable: false,
      blockReason:
        input.destZone === "O"
          ? "This address is outside our regular delivery zone (ODZ) for standard parcel booking."
          : "This address is not currently serviceable for standard parcel booking.",
      ...BLOCKED,
    };
  }

  const originBucket = resolveRateBucket(input.originProvince, input.originCity);
  const destBucket = resolveRateBucket(input.destProvince, input.destCity);
  const destMainRegion = resolveMainRegion(input.destProvince);
  const destKey = retailDestKey2026(input.originProvince, originBucket, input.destProvince, destBucket, destMainRegion);

  if (!destKey) {
    return { serviceable: false, blockReason: "Unable to determine a rate for this route.", ...BLOCKED };
  }

  const rateRow = RATES[originBucket]?.[destKey];
  if (!rateRow) {
    return { serviceable: false, blockReason: "No published rate found for this route.", ...BLOCKED };
  }

  let freight: number;
  let chargeableWeightKg: number | undefined;

  if (input.product === "gen_cargo") {
    const weightKg = input.weightKg || 0;
    if (weightKg <= 0) {
      return { serviceable: false, blockReason: "Enter the parcel's weight.", ...BLOCKED };
    }
    if (weightKg > GEN_CARGO_WEIGHT_LIMIT_KG) {
      return { serviceable: false, blockReason: `General Cargo is limited to ${GEN_CARGO_WEIGHT_LIMIT_KG}kg.`, ...BLOCKED };
    }
    let volumetricWeight = 0;
    if (input.lengthCm && input.widthCm && input.heightCm) {
      const volumeCm3 = input.lengthCm * input.widthCm * input.heightCm;
      if (volumeCm3 > GEN_CARGO_VOLUME_LIMIT_CM3) {
        return { serviceable: false, blockReason: "General Cargo is limited to 1 cubic meter (100 x 100 x 100cm).", ...BLOCKED };
      }
      volumetricWeight = volumeCm3 / 3500;
    }
    chargeableWeightKg = Math.round(Math.max(weightKg, volumetricWeight) * 100) / 100;
    const [minCharge, perKgRate] = rateRow.gen_cargo;
    freight = chargeableWeightKg <= 3 ? minCharge : Math.round(chargeableWeightKg * perKgRate);
  } else {
    const limit = PRODUCT_WEIGHT_LIMIT[input.product];
    if (limit != null && input.weightKg != null && input.weightKg > limit) {
      return { serviceable: false, blockReason: `This product is limited to ${limit}kg — pick a larger tier.`, ...BLOCKED };
    }
    freight = rateRow[input.product];
  }

  const insurance = DOC_KEYS.has(input.product) ? 0 : insuranceFee(input.declaredValue);
  const boxFee = KB_KEYS.has(input.product) ? BOX_FEE[input.product] || 0 : 0;
  const surcharge = Math.round(freight * 0.07);

  const freightExcl = freight / 1.12;
  const boxFeeExcl = boxFee / 1.12;
  const insuranceExcl = insurance / 1.12;
  const surchargeExcl = surcharge / 1.12;
  const vat = freight - freightExcl + (boxFee - boxFeeExcl) + (insurance - insuranceExcl) + (surcharge - surchargeExcl);

  const finalFare = Math.round(freight + boxFee + insurance + surcharge);

  return { serviceable: true, freight, insurance, boxFee, surcharge, vat, finalFare, chargeableWeightKg };
}
