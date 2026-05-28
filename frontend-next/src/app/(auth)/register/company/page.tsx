"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { 
  Building2, Mail, Lock, User, Phone, MapPin, 
  Loader2, Eye, EyeOff, CheckCircle, AlertTriangle, Link2, ArrowLeft
} from "lucide-react";
import api, { verifyInviteToken } from "@/lib/api";

interface CompanyRegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  company_name: string;
  legal_form: string;
  contact_person: string;
  phone: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  privacy: boolean;
}

function CompanyRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenName, setTokenName] = useState<string | null>(null);
  const [tokenMessage, setTokenMessage] = useState<string | null>(null);
  const [checkingToken, setCheckingToken] = useState(!!inviteToken);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CompanyRegisterForm>();

  const password = watch("password");

  useEffect(() => {
    if (inviteToken) {
      checkInviteToken(inviteToken);
    }
  }, [inviteToken]);

  const checkInviteToken = async (token: string) => {
    setCheckingToken(true);
    try {
      const response = await verifyInviteToken(token);
      setTokenValid(response.data.valid);
      setTokenName(response.data.name || null);
      setTokenMessage(response.data.message);
    } catch (error) {
      setTokenValid(false);
      setTokenMessage("Fehler beim Prüfen des Einladungs-Links");
    } finally {
      setCheckingToken(false);
    }
  };

  const onSubmit = async (data: CompanyRegisterForm) => {
    setLoading(true);
    try {
      await api.post("/auth/register/company", {
        user_data: {
          email: data.email,
          password: data.password,
        },
        company_data: {
          company_name: data.company_name,
          legal_form: data.legal_form,
          contact_person: data.contact_person,
          phone: data.phone,
          street: data.street,
          house_number: data.house_number,
          postal_code: data.postal_code,
          city: data.city,
        },
        invite_token: inviteToken || undefined,
      });

      if (inviteToken && tokenValid) {
        toast.success("Registrierung erfolgreich! Sie können sich jetzt einloggen.");
        router.push("/login");
      } else {
        toast.success("Registrierung erfolgreich! Ihr Konto wird geprüft und freigeschaltet.");
        router.push("/login");
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Registrierung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  const legalForms = [
    { value: "gmbh", label: "GmbH" },
    { value: "ug", label: "UG (haftungsbeschränkt)" },
    { value: "ag", label: "AG" },
    { value: "kg", label: "KG" },
    { value: "ohg", label: "OHG" },
    { value: "gbr", label: "GbR" },
    { value: "einzelunternehmen", label: "Einzelunternehmen" },
    { value: "ev", label: "e.V." },
    { value: "sonstige", label: "Sonstige" },
  ];

  if (checkingToken) {
    return (
      <div className="max-w-md mx-auto">
        <div className="card text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Einladungs-Link wird geprüft...</p>
        </div>
      </div>
    );
  }

  if (inviteToken && tokenValid === false) {
    return (
      <div className="max-w-md mx-auto">
        <div className="card text-center py-12">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ungültiger Einladungs-Link</h2>
          <p className="text-gray-600 mb-6">{tokenMessage}</p>
          <div className="space-y-3">
            <Link href="/register" className="btn-primary block">
              Zur normalen Registrierung
            </Link>
            <Link href="/login" className="btn-secondary block">
              Zum Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="card">
        <div className="text-center mb-6">
          <Link href="/" className="inline-block mb-4">
            <img src="/logo.png" alt="IJP" className="h-16 w-auto mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Firmen-Registrierung</h1>
          <p className="text-gray-600 mt-1">Erstellen Sie Ihr Unternehmenskonto</p>
        </div>

        {/* Invite Token Info */}
        {inviteToken && tokenValid && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Link2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">
                  Einladungs-Link erkannt
                  {tokenName && <span className="font-normal"> – {tokenName}</span>}
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Ihr Konto wird nach der Registrierung sofort aktiviert.
                </p>
              </div>
            </div>
          </div>
        )}

        {!inviteToken && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Hinweis</p>
                <p className="text-sm text-amber-700 mt-1">
                  Ohne Einladungs-Link muss Ihr Konto erst von einem Administrator freigeschaltet werden.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Company Info Section */}
          <div className="border-b pb-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary-600" />
              Unternehmensdaten
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Firmenname *
                </label>
                <input
                  type="text"
                  {...register("company_name", { required: "Firmenname erforderlich" })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Muster GmbH"
                />
                {errors.company_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.company_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rechtsform *
                </label>
                <select
                  {...register("legal_form", { required: "Rechtsform erforderlich" })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Bitte wählen</option>
                  {legalForms.map((form) => (
                    <option key={form.value} value={form.value}>
                      {form.label}
                    </option>
                  ))}
                </select>
                {errors.legal_form && (
                  <p className="text-red-500 text-sm mt-1">{errors.legal_form.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ansprechpartner *
                </label>
                <input
                  type="text"
                  {...register("contact_person", { required: "Ansprechpartner erforderlich" })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Max Mustermann"
                />
                {errors.contact_person && (
                  <p className="text-red-500 text-sm mt-1">{errors.contact_person.message}</p>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon *
                </label>
                <input
                  type="tel"
                  {...register("phone", { required: "Telefon erforderlich" })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="+49 123 456789"
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="border-b pb-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary-600" />
              Adresse
            </h3>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Straße *
                </label>
                <input
                  type="text"
                  {...register("street", { required: "Straße erforderlich" })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Musterstraße"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nr. *
                </label>
                <input
                  type="text"
                  {...register("house_number", { required: "Hausnummer erforderlich" })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="1a"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PLZ *
                </label>
                <input
                  type="text"
                  {...register("postal_code", { required: "PLZ erforderlich" })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="12345"
                />
              </div>

              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stadt *
                </label>
                <input
                  type="text"
                  {...register("city", { required: "Stadt erforderlich" })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Musterstadt"
                />
              </div>
            </div>
          </div>

          {/* Account Section */}
          <div className="border-b pb-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary-600" />
              Zugangsdaten
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail-Adresse *
                </label>
                <input
                  type="email"
                  {...register("email", { 
                    required: "E-Mail erforderlich",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Ungültige E-Mail-Adresse"
                    }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="firma@beispiel.de"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passwort *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password", { 
                      required: "Passwort erforderlich",
                      minLength: {
                        value: 8,
                        message: "Mindestens 8 Zeichen"
                      }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passwort bestätigen *
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("confirmPassword", { 
                    required: "Passwort-Bestätigung erforderlich",
                    validate: value => value === password || "Passwörter stimmen nicht überein"
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="••••••••"
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Privacy */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              {...register("privacy", { required: "Bitte akzeptieren Sie die Datenschutzerklärung" })}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label className="text-sm text-gray-600">
              Ich akzeptiere die{" "}
              <Link href="/datenschutz" className="text-primary-600 hover:underline">
                Datenschutzerklärung
              </Link>{" "}
              und die{" "}
              <Link href="/agb" className="text-primary-600 hover:underline">
                AGB
              </Link>
              . *
            </label>
          </div>
          {errors.privacy && (
            <p className="text-red-500 text-sm">{errors.privacy.message}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Registrierung läuft...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                Registrieren
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Bereits registriert?{" "}
          <Link href="/login" className="text-primary-600 hover:underline font-medium">
            Zum Login
          </Link>
        </div>

        <div className="mt-4 text-center">
          <Link 
            href="/register" 
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Registrierungsauswahl
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CompanyRegisterPage() {
  return (
    <Suspense fallback={
      <div className="max-w-md mx-auto">
        <div className="card text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    }>
      <CompanyRegisterContent />
    </Suspense>
  );
}
