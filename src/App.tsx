import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useIsMobile } from "./hooks/useIsMobile";
import { MapsProvider } from "./context/MapsContext";
import { DataProvider } from "./context/DataContext";
import { ConfigProvider } from "./context/ConfigContext";
import RequireAuth from "./components/RequireAuth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import RegisterChoice from "./pages/registration/RegisterChoice";
import RegisterBusiness from "./pages/registration/RegisterBusiness";
import RegisterIndividual from "./pages/registration/RegisterIndividual";
import Dashboard from "./pages/Dashboard";
import ParcelBooking from "./pages/ParcelBooking";
import OnDemandBooking from "./pages/OnDemandBooking";
import Shipments from "./pages/Shipments";
import Tracking from "./pages/Tracking";
import Documentation from "./pages/Documentation";
import Support from "./pages/Support";
import Administration from "./pages/Administration";

function RedirectRoot() {
  const { session } = useAuth();
  const isMobile = useIsMobile();
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={isMobile ? "/booking/on-demand" : "/dashboard"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MapsProvider>
          <DataProvider>
            <ConfigProvider>
              <Routes>
                <Route path="/" element={<RedirectRoot />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<RegisterChoice />} />
                <Route path="/register/business" element={<RegisterBusiness />} />
                <Route path="/register/individual" element={<RegisterIndividual />} />

                <Route element={<RequireAuth />}>
                  <Route element={<Layout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/booking/parcel" element={<ParcelBooking />} />
                    <Route path="/booking/on-demand" element={<OnDemandBooking />} />
                    <Route path="/shipments" element={<Shipments />} />
                    <Route path="/tracking" element={<Tracking />} />
                    <Route path="/documentation" element={<Documentation />} />
                    <Route path="/support" element={<Support />} />
                    <Route path="/administration" element={<Administration />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ConfigProvider>
          </DataProvider>
        </MapsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
