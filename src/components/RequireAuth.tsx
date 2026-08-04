import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

export default function RequireAuth() {
  const { session, profile, loading, configured } = useAuth();

  if (!configured) {
    return (
      <div className="flex h-screen items-center justify-center bg-lbc-bg p-8 text-center">
        <div className="max-w-md">
          <h1 className="text-xl font-bold text-gray-900">Backend not configured</h1>
          <p className="mt-2 text-sm text-gray-500">
            Set <code className="rounded bg-gray-100 px-1.5 py-0.5">VITE_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5">VITE_SUPABASE_ANON_KEY</code> in a{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5">.env</code> file (see README.md), then restart the
            dev server.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-lbc-bg">
        <Loader2 className="h-8 w-8 animate-spin text-lbc-red" />
      </div>
    );
  }

  if (!session || !profile) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
