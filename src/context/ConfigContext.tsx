import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import type { PricingConfig, ProductType, Vehicle } from "../types";

interface ConfigContextValue {
  pricing: PricingConfig[];
  vehicles: Vehicle[];
  productTypes: ProductType[];
  loading: boolean;
  refresh: () => Promise<void>;
  updatePricing: (id: string, patch: Partial<Pick<PricingConfig, "baseFare" | "perKm" | "minFare">>) => Promise<void>;
  addVehicle: (name: string, description: string) => Promise<void>;
  toggleVehicle: (id: string, active: boolean) => Promise<void>;
  addProductType: (name: string, description: string) => Promise<void>;
  toggleProductType: (id: string, active: boolean) => Promise<void>;
}

const DEFAULT_PRICING: PricingConfig[] = [
  { id: "default-standard", productType: "standard", baseFare: 49, perKm: 9, minFare: 49 },
  { id: "default-medical", productType: "medical", baseFare: 69, perKm: 12, minFare: 69 },
];

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { session, configured } = useAuth();
  const [pricing, setPricing] = useState<PricingConfig[]>(DEFAULT_PRICING);
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { id: "default-moto", name: "Motorcycle", description: "Standard on-demand delivery vehicle", active: true },
  ]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([
    { id: "default-standard", name: "Standard", description: "General documents and parcels", active: true },
    { id: "default-medical", name: "Medical", description: "Medical specimens, medicines, laboratory items", active: true },
  ]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!configured || !session) return;
    setLoading(true);
    const [pricingRes, vehiclesRes, productsRes] = await Promise.all([
      supabase.from("pricing_config").select("*"),
      supabase.from("vehicles").select("*"),
      supabase.from("product_types").select("*"),
    ]);
    if (pricingRes.data && pricingRes.data.length) {
      setPricing(
        pricingRes.data.map((r) => ({
          id: r.id,
          productType: r.product_type,
          baseFare: Number(r.base_fare),
          perKm: Number(r.per_km),
          minFare: Number(r.min_fare),
        }))
      );
    }
    if (vehiclesRes.data && vehiclesRes.data.length) {
      setVehicles(vehiclesRes.data.map((r) => ({ id: r.id, name: r.name, description: r.description || "", active: r.active })));
    }
    if (productsRes.data && productsRes.data.length) {
      setProductTypes(productsRes.data.map((r) => ({ id: r.id, name: r.name, description: r.description || "", active: r.active })));
    }
    setLoading(false);
  }, [configured, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updatePricing = useCallback<ConfigContextValue["updatePricing"]>(async (id, patch) => {
    setPricing((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    if (!id.startsWith("default-")) {
      await supabase
        .from("pricing_config")
        .update({
          ...(patch.baseFare !== undefined ? { base_fare: patch.baseFare } : {}),
          ...(patch.perKm !== undefined ? { per_km: patch.perKm } : {}),
          ...(patch.minFare !== undefined ? { min_fare: patch.minFare } : {}),
        })
        .eq("id", id);
    }
  }, []);

  const addVehicle = useCallback(async (name: string, description: string) => {
    const { data, error } = await supabase.from("vehicles").insert({ name, description }).select("*").single();
    if (!error && data) {
      setVehicles((prev) => [...prev, { id: data.id, name: data.name, description: data.description || "", active: data.active }]);
    }
  }, []);

  const toggleVehicle = useCallback(async (id: string, active: boolean) => {
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, active } : v)));
    if (!id.startsWith("default-")) await supabase.from("vehicles").update({ active }).eq("id", id);
  }, []);

  const addProductType = useCallback(async (name: string, description: string) => {
    const { data, error } = await supabase.from("product_types").insert({ name, description }).select("*").single();
    if (!error && data) {
      setProductTypes((prev) => [...prev, { id: data.id, name: data.name, description: data.description || "", active: data.active }]);
    }
  }, []);

  const toggleProductType = useCallback(async (id: string, active: boolean) => {
    setProductTypes((prev) => prev.map((p) => (p.id === id ? { ...p, active } : p)));
    if (!id.startsWith("default-")) await supabase.from("product_types").update({ active }).eq("id", id);
  }, []);

  const value = useMemo<ConfigContextValue>(
    () => ({ pricing, vehicles, productTypes, loading, refresh, updatePricing, addVehicle, toggleVehicle, addProductType, toggleProductType }),
    [pricing, vehicles, productTypes, loading, refresh, updatePricing, addVehicle, toggleVehicle, addProductType, toggleProductType]
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within ConfigProvider");
  return ctx;
}
