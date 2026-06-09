"use client";

import { useState, useEffect, useRef } from "react";
import { companyAPI, resolveFileUrl } from "@/lib/api";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Building2, Save, Loader2, Upload, Camera, X, MapPin, Globe, Phone, User, FileText } from "lucide-react";
import Image from "next/image";

const companySizes = [
  { value: "1-10", label: "1-10 Mitarbeiter" },
  { value: "11-50", label: "11-50 Mitarbeiter" },
  { value: "51-200", label: "51-200 Mitarbeiter" },
  { value: "201-500", label: "201-500 Mitarbeiter" },
  { value: "501-1000", label: "501-1000 Mitarbeiter" },
  { value: "1000+", label: "Über 1000 Mitarbeiter" },
];

const industries = [
  "Landwirtschaft",
  "Gastronomie & Hotellerie",
  "Bau & Handwerk",
  "Produktion & Fertigung",
  "Logistik & Transport",
  "Einzelhandel",
  "IT & Technologie",
  "Gesundheitswesen",
  "Pflege",
  "Sonstiges",
];

interface ProfileForm {
  company_name: string;
  contact_person: string;
  phone: string;
  website: string;
  industry: string;
  company_size: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  country: string;
  description: string;
}

export default function CompanyProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await companyAPI.getProfile();
      reset(response.data);
      if (response.data.logo) setLogoUrl(response.data.logo);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status !== 404) {
        toast.error("Fehler beim Laden des Profils");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte nur Bilddateien hochladen");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Datei zu groß (max. 5 MB)");
      return;
    }
    
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await companyAPI.uploadLogo(formData);
      setLogoUrl(response.data.logo_url);
      toast.success("Logo hochgeladen!");
    } catch {
      toast.error("Fehler beim Hochladen");
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = async () => {
    try {
      await companyAPI.deleteLogo();
      setLogoUrl(null);
      toast.success("Logo entfernt");
    } catch {
      toast.error("Fehler beim Entfernen");
    }
  };

  const onSubmit = async (data: ProfileForm) => {
    setSaving(true);
    try {
      await companyAPI.updateProfile(data);
      toast.success("Profil erfolgreich gespeichert!");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary-100 rounded-xl"><Building2 className="h-8 w-8 text-primary-600" /></div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Firmenprofil</h1>
          <p className="text-gray-600">Verwalten Sie Ihre Unternehmensinformationen</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Logo Upload */}
        <div className="card border-l-4 border-l-primary-500">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2"><Camera className="h-5 w-5 text-primary-600" />Firmenlogo</h2>
          <p className="text-gray-600 text-sm mb-6">Ihr Logo wird auf Stellenanzeigen und in Ihrem Profil angezeigt.</p>
          <div className="flex items-center gap-6">
            <div className="relative">
              {logoUrl ? (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-gray-200 bg-white">
                  <Image src={resolveFileUrl(logoUrl)} alt="Firmenlogo" fill className="object-contain p-2" />
                  <button type="button" onClick={removeLogo} className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                  <Building2 className="h-12 w-12 text-gray-300" />
                </div>
              )}
            </div>
            <div>
              <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
              <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="btn-secondary flex items-center gap-2">
                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {logoUrl ? "Logo ändern" : "Logo hochladen"}
              </button>
              <p className="text-xs text-gray-500 mt-2">PNG, JPG oder SVG. Max. 5 MB.</p>
            </div>
          </div>
        </div>

        {/* Firmendaten */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2"><Building2 className="h-5 w-5 text-primary-600" />Firmendaten</h2>
          <p className="text-gray-600 text-sm mb-6">Grundlegende Informationen über Ihr Unternehmen.</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Firmenname *</label>
              <input type="text" className="input-styled" placeholder="Musterfirma GmbH" {...register("company_name", { required: "Firmenname ist erforderlich" })} />
              {errors.company_name && <p className="text-red-500 text-sm mt-1">{errors.company_name.message}</p>}
            </div>
            <div>
              <label className="label flex items-center gap-2"><User className="h-4 w-4 text-gray-400" />Ansprechpartner</label>
              <input type="text" className="input-styled" placeholder="Max Mustermann" {...register("contact_person")} />
            </div>
            <div>
              <label className="label flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" />Telefon</label>
              <input type="tel" className="input-styled" placeholder="+49 123 456789" {...register("phone")} />
            </div>
            <div>
              <label className="label flex items-center gap-2"><Globe className="h-4 w-4 text-gray-400" />Website</label>
              <input type="url" className="input-styled" placeholder="https://www.beispiel.de" {...register("website")} />
            </div>
            <div>
              <label className="label">Branche</label>
              <select className="input-styled" {...register("industry")}>
                <option value="">Bitte wählen</option>
                {industries.map((industry) => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Unternehmensgröße</label>
              <select className="input-styled" {...register("company_size")}>
                <option value="">Bitte wählen</option>
                {companySizes.map((size) => (
                  <option key={size.value} value={size.value}>{size.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Adresse */}
        <div className="card border-l-4 border-l-green-500">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2"><MapPin className="h-5 w-5 text-green-600" />Adresse</h2>
          <p className="text-gray-600 text-sm mb-6">Standort Ihres Unternehmens.</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="label">Straße</label>
                <input type="text" className="input-styled" placeholder="Musterstraße" {...register("street")} />
              </div>
              <div>
                <label className="label">Hausnummer</label>
                <input type="text" className="input-styled" placeholder="123" {...register("house_number")} />
              </div>
            </div>
            <div>
              <label className="label">PLZ</label>
              <input type="text" className="input-styled" placeholder="12345" {...register("postal_code")} />
            </div>
            <div>
              <label className="label">Stadt</label>
              <input type="text" className="input-styled" placeholder="Berlin" {...register("city")} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Land</label>
              <input type="text" className="input-styled" placeholder="Deutschland" {...register("country")} />
            </div>
          </div>
        </div>

        {/* Beschreibung */}
        <div className="card border-l-4 border-l-purple-500">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2"><FileText className="h-5 w-5 text-purple-600" />Unternehmensbeschreibung</h2>
          <p className="text-gray-600 text-sm mb-6">Beschreiben Sie Ihr Unternehmen für potenzielle Bewerber.</p>
          <div>
            <label className="label">Über uns</label>
            <textarea className="input-styled min-h-[150px]" rows={6} placeholder="Beschreiben Sie Ihr Unternehmen, Ihre Werte und was Sie als Arbeitgeber auszeichnet..." {...register("description")} />
            <p className="text-sm text-gray-500 mt-2">Diese Beschreibung wird auf Ihren Stellenangeboten angezeigt.</p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end sticky bottom-4">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 shadow-lg">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Profil speichern
          </button>
        </div>
      </form>
    </>
  );
}
