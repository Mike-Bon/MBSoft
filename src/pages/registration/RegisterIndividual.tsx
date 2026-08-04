import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, type IndividualRegistration } from "../../context/AuthContext";
import AuthShell from "../AuthShell";
import AddressFields from "../../components/AddressFields";
import FileUploadField from "../../components/FileUploadField";
import { LiabilityDisclaimer } from "../../components/DisclaimerNote";
import { isValidMobile } from "../../lib/utils";
import { useIsMobile } from "../../hooks/useIsMobile";
import type { Address } from "../../types";

const emptyAddress: Address = { province: "", city: "", barangay: "", street: "", houseNumber: "", landmark: "" };

export default function RegisterIndividual() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [name, setName] = useState("");
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!idFile) return setError("Please upload a Government ID.");
    if (!isValidMobile(contactNumber)) return setError("Contact number must be a valid PH mobile number (e.g. 09171234567).");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (!agreed) return setError("Please confirm the disclaimer to continue.");

    const payload: IndividualRegistration = {
      accountKind: "individual",
      name,
      address,
      idType: "Government ID",
      idFile,
      email,
      contactNumber,
      password,
    };

    setSubmitting(true);
    try {
      await signUp(payload);
      navigate(isMobile ? "/booking/on-demand" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Individual registration" subtitle="This account will automatically be the shipper on your bookings." wide>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Full Name">
          <input required className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Address</span>
          <AddressFields value={address} onChange={setAddress} />
        </div>

        <FileUploadField label="Upload Government ID" file={idFile} onChange={setIdFile} />

        <div className="rounded-lg border border-lbc-border bg-lbc-bg px-4 py-2.5 text-sm text-gray-600">
          Account Type: <span className="font-semibold text-gray-900">Cash Only</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email">
            <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Contact Number">
            <input
              required
              className="input"
              placeholder="09XX XXX XXXX"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Password">
          <input
            type="password"
            required
            minLength={8}
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <LiabilityDisclaimer checked={agreed} onChange={setAgreed} />

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Creating account…" : "Create Individual Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already registered?{" "}
        <Link to="/login" className="font-semibold text-lbc-red hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
