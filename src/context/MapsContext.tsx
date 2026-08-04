import { createContext, useContext, type ReactNode } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

interface MapsContextValue {
  isLoaded: boolean;
  loadError: Error | undefined;
  apiKeyConfigured: boolean;
}

const MapsContext = createContext<MapsContextValue>({ isLoaded: false, loadError: undefined, apiKeyConfigured: false });

export function MapsProvider({ children }: { children: ReactNode }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const apiKeyConfigured = Boolean(apiKey);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  return (
    <MapsContext.Provider value={{ isLoaded: apiKeyConfigured && isLoaded, loadError, apiKeyConfigured }}>
      {children}
    </MapsContext.Provider>
  );
}

export function useMaps() {
  return useContext(MapsContext);
}
