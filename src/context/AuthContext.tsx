import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { seedDemoDataForUser } from "../lib/seed";
import type { AccountKind, AccountType, Address, Profile } from "../types";

export interface BusinessRegistration {
  accountKind: "business";
  name: string;
  address: Address;
  tinNumber: string;
  accountType: AccountType;
  authorizedRepresentative: string;
  idType: "Government ID" | "Company ID";
  idFile: File;
  email: string;
  contactNumber: string;
  password: string;
}

export interface IndividualRegistration {
  accountKind: "individual";
  name: string;
  address: Address;
  idType: "Government ID";
  idFile: File;
  email: string;
  contactNumber: string;
  password: string;
}

export type Registration = BusinessRegistration | IndividualRegistration;

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: Registration) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapProfileRow(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    accountKind: row.account_kind as AccountKind,
    name: row.name as string,
    address: {
      province: row.address_province as string,
      city: row.address_city as string,
      barangay: row.address_barangay as string,
      street: row.address_street as string,
      houseNumber: row.address_house_number as string,
      landmark: (row.address_landmark as string) ?? undefined,
    },
    tinNumber: (row.tin_number as string) ?? undefined,
    accountType: row.account_type as AccountType,
    authorizedRepresentative: (row.authorized_representative as string) ?? undefined,
    idType: row.id_type as string,
    idDocumentUrl: (row.id_document_path as string) ?? undefined,
    email: row.email as string,
    contactNumber: row.contact_number as string,
    createdAt: row.created_at as string,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (!error && data) {
      setProfile(mapProfileRow(data));
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) loadProfile(newSession.user.id);
      else setProfile(null);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (data: Registration) => {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    if (signUpError) throw signUpError;
    const userId = signUpData.user?.id;
    if (!userId) {
      throw new Error("Registration succeeded but no session was returned. Check your email to confirm your account, then sign in.");
    }

    let idDocumentPath: string | undefined;
    const ext = data.idFile.name.split(".").pop() || "jpg";
    const path = `${userId}/${data.idType.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("id-uploads").upload(path, data.idFile, {
      upsert: true,
    });
    if (uploadError) {
      throw new Error(`Account created, but the ID upload failed: ${uploadError.message}`);
    }
    idDocumentPath = path;

    const row = {
      id: userId,
      account_kind: data.accountKind,
      name: data.name,
      address_province: data.address.province,
      address_city: data.address.city,
      address_barangay: data.address.barangay,
      address_street: data.address.street,
      address_house_number: data.address.houseNumber,
      address_landmark: data.address.landmark || null,
      tin_number: data.accountKind === "business" ? data.tinNumber : null,
      account_type: data.accountKind === "business" ? data.accountType : "cash",
      authorized_representative: data.accountKind === "business" ? data.authorizedRepresentative : null,
      id_type: data.idType,
      id_document_path: idDocumentPath,
      email: data.email,
      contact_number: data.contactNumber,
    };

    const { data: insertedRow, error: profileError } = await supabase.from("profiles").insert(row).select("*").single();
    if (profileError || !insertedRow) {
      throw new Error(`Account created, but saving your profile failed: ${profileError?.message}`);
    }

    // Seed demo data exactly once here — loadProfile (triggered separately by the
    // onAuthStateChange listener firing from this same signUp) intentionally does
    // NOT seed, to avoid a duplicate-insert race on the unique tracking number.
    await seedDemoDataForUser(userId);

    if (signUpData.session) {
      setSession(signUpData.session);
      setProfile(mapProfileRow(insertedRow));
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, profile, loading, configured: supabaseConfigured, signIn, signUp, signOut }),
    [session, profile, loading, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
