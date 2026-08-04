import { Link } from "react-router-dom";
import { Building2, User } from "lucide-react";
import AuthShell from "../AuthShell";

export default function RegisterChoice() {
  return (
    <AuthShell title="Create your account" subtitle="Choose the account type that fits how you ship." wide>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          to="/register/business"
          className="group flex flex-col items-start gap-3 rounded-xl border border-lbc-border p-5 transition hover:border-lbc-red hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-lbc-red-light text-lbc-red">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-gray-900 group-hover:text-lbc-red">Business</p>
            <p className="mt-1 text-sm text-gray-500">
              For companies and merchants. Supports Charge or Cash accounts, with an authorized representative and
              company or government ID.
            </p>
          </div>
        </Link>
        <Link
          to="/register/individual"
          className="group flex flex-col items-start gap-3 rounded-xl border border-lbc-border p-5 transition hover:border-lbc-red hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-lbc-red-light text-lbc-red">
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-gray-900 group-hover:text-lbc-red">Individual</p>
            <p className="mt-1 text-sm text-gray-500">
              For personal shippers. Cash accounts only, verified with a government-issued ID.
            </p>
          </div>
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already registered?{" "}
        <Link to="/login" className="font-semibold text-lbc-red hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
