import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import type { ProductType, Vehicle } from "../types";

type VehiclePatch = Partial<Omit<Vehicle, "id" | "name">>;
type ProductTypePatch = Partial<Pick<ProductType, "multiplier" | "active" | "description">>;

interface ConfigContextValue {
  vehicles: Vehicle[];
  productTypes: ProductType[];
  loading: boolean;
  refresh: () => Promise<void>;
  updateVehicle: (id: string, patch: VehiclePatch) => Promise<void>;
  addVehicle: (name: string, description: string) => Promise<void>;
  updateProductType: (id: string, patch: ProductTypePatch) => Promise<void>;
  addProductType: (name: string, description: string, multiplier: number) => Promise<void>;
}

const DEFAULT_VEHICLES: Vehicle[] = [
  {
    id: "default-moto",
    name: "Motorcycle",
    description: "Standard on-demand delivery vehicle",
    active: true,
    visible: true,
    baseFare: 49,
    includedKm: 5,
    rateFirstKm: 6,
    rateAfterIncluded: 5,
    timeRate: 1,
    trafficMultiplier: 1,
    demandMultiplier: 1,
    zoneMultiplier: 1,
    platformMargin: 5,
  },
];

const DEFAULT_PRODUCT_TYPES: ProductType[] = [
  { id: "default-standard", name: "Standard", description: "General documents and parcels", active: true, multiplier: 1.0 },
  { id: "default-medical", name: "Medical", description: "Medical specimens, medicines, laboratory items", active: true, multiplier: 1.2 },
];

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

function mapVehicleRow(r: Record<string, unknown>): Vehicle {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) || "",
    active: r.active as boolean,
    visible: Boolean(r.visible),
    baseFare: Number(r.base_fare),
    includedKm: Number(r.included_km),
    rateFirstKm: Number(r.rate_first_km),
    rateAfterIncluded: Number(r.rate_after_included),
    timeRate: Number(r.time_rate),
    trafficMultiplier: Number(r.traffic_multiplier),
    demandMultiplier: Number(r.demand_multiplier),
    zoneMultiplier: Number(r.zone_multiplier),
    platformMargin: Number(r.platform_margin),
    maxWeightKg: r.max_weight_kg == null ? undefined : Number(r.max_weight_kg),
    maxDimensions: (r.max_dimensions as string) || undefined,
  };
}

function mapProductTypeRow(r: Record<string, unknown>): ProductType {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) || "",
    active: r.active as boolean,
    multiplier: Number(r.multiplier),
  };
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { session, configured } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>(DEFAULT_VEHICLES);
  const [productTypes, setProductTypes] = useState<ProductType[]>(DEFAULT_PRODUCT_TYPES);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!configured || !session) return;
    setLoading(true);
    const [vehiclesRes, productsRes] = await Promise.all([
      supabase.from("vehicles").select("*"),
      supabase.from("product_types").select("*"),
    ]);
    if (vehiclesRes.data && vehiclesRes.data.length) setVehicles(vehiclesRes.data.map(mapVehicleRow));
    if (productsRes.data && productsRes.data.length) setProductTypes(productsRes.data.map(mapProductTypeRow));
    setLoading(false);
  }, [configured, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateVehicle = useCallback(async (id: string, patch: VehiclePatch) => {
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
    if (id.startsWith("default-")) return;
    const dbPatch: Record<string, unknown> = {};
    if (patch.active !== undefined) dbPatch.active = patch.active;
    if (patch.visible !== undefined) dbPatch.visible = patch.visible;
    if (patch.description !== undefined) dbPatch.description = patch.description;
    if (patch.baseFare !== undefined) dbPatch.base_fare = patch.baseFare;
    if (patch.includedKm !== undefined) dbPatch.included_km = patch.includedKm;
    if (patch.rateFirstKm !== undefined) dbPatch.rate_first_km = patch.rateFirstKm;
    if (patch.rateAfterIncluded !== undefined) dbPatch.rate_after_included = patch.rateAfterIncluded;
    if (patch.timeRate !== undefined) dbPatch.time_rate = patch.timeRate;
    if (patch.trafficMultiplier !== undefined) dbPatch.traffic_multiplier = patch.trafficMultiplier;
    if (patch.demandMultiplier !== undefined) dbPatch.demand_multiplier = patch.demandMultiplier;
    if (patch.zoneMultiplier !== undefined) dbPatch.zone_multiplier = patch.zoneMultiplier;
    if (patch.platformMargin !== undefined) dbPatch.platform_margin = patch.platformMargin;
    if (patch.maxWeightKg !== undefined) dbPatch.max_weight_kg = patch.maxWeightKg;
    if (patch.maxDimensions !== undefined) dbPatch.max_dimensions = patch.maxDimensions;
    await supabase.from("vehicles").update(dbPatch).eq("id", id);
  }, []);

  const addVehicle = useCallback(async (name: string, description: string) => {
    const { data, error } = await supabase.from("vehicles").insert({ name, description }).select("*").single();
    if (!error && data) setVehicles((prev) => [...prev, mapVehicleRow(data)]);
  }, []);

  const updateProductType = useCallback(async (id: string, patch: ProductTypePatch) => {
    setProductTypes((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    if (id.startsWith("default-")) return;
    const dbPatch: Record<string, unknown> = {};
    if (patch.multiplier !== undefined) dbPatch.multiplier = patch.multiplier;
    if (patch.active !== undefined) dbPatch.active = patch.active;
    if (patch.description !== undefined) dbPatch.description = patch.description;
    await supabase.from("product_types").update(dbPatch).eq("id", id);
  }, []);

  const addProductType = useCallback(async (name: string, description: string, multiplier: number) => {
    const { data, error } = await supabase
      .from("product_types")
      .insert({ name, description, multiplier })
      .select("*")
      .single();
    if (!error && data) setProductTypes((prev) => [...prev, mapProductTypeRow(data)]);
  }, []);

  const value = useMemo<ConfigContextValue>(
    () => ({ vehicles, productTypes, loading, refresh, updateVehicle, addVehicle, updateProductType, addProductType }),
    [vehicles, productTypes, loading, refresh, updateVehicle, addVehicle, updateProductType, addProductType]
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within ConfigProvider");
  return ctx;
}
