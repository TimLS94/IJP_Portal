"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Mail, Lock, Loader2, Eye, EyeOff, GraduationCap } from "lucide-react";
import { getStoredSource, clearStoredSource } from "@/lib/sourceTracking";
import GoogleLoginButton from "@/components/GoogleLoginButton";

interface IjpRegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  privacy: boolean;
}

function IjpRegisterPageInner() {
  const { registerApplicant } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSource = searchParams.get("source");
  // Quelle aus URL oder localStorage (Partner-/Einladungslink), damit Tracking erhalten bleibt.
  const [sourceToken, setSourceToken] = useState<string | null>(urlSource);
  useEffect(() => {
    if (!urlSource) {
      const stored = getStoredSource();
      if (stored) setSourceToken(stored);
    }
  }, [urlSource]);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<IjpRegisterForm>();

  const password = watch("password");

  const onSubmit = async (data: IjpRegisterForm) => {
    setLoading(true);
    try {
      await registerApplicant(
        data.email,
        data.password,
        data.firstName,
        data.lastName,
        sourceToken,
        "ijp"
      );
      clearStoredSource();
      toast.success(t("auth.ijpRegistrationSuccess"));
      router.push("/applicant/profile");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || t("auth.registerFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="card">
        <div className="text-center mb-6">
          <Link href="/register/ijp" className="inline-block mb-4">
            <img src="/logo-ijp.svg" alt="IJP - International Job Placement" className="h-24 w-auto mx-auto" />
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700 mb-3">
            <GraduationCap className="h-4 w-4" />
            {t("auth.ijpBadge")}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t("auth.ijpCreateAccount")}</h1>
          <p className="text-gray-600 mt-1">
            {t("auth.ijpDescription")}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t("auth.firstName")}</label>
              <input
                type="text"
                className="input-styled"
                placeholder="Max"
                {...register("firstName", { required: t("auth.firstNameRequired") })}
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="label">{t("auth.lastName")}</label>
              <input
                type="text"
                className="input-styled"
                placeholder="Mustermann"
                {...register("lastName", { required: t("auth.lastNameRequired") })}
              />
              {errors.lastName && (
                <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="label">{t("auth.email")}</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                className="input-styled pl-12"
                placeholder="your@email.com"
                {...register("email", {
                  required: t("auth.emailRequired"),
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: t("auth.invalidEmail"),
                  },
                })}
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="label">{t("auth.password")}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                className="input-styled pl-12 pr-12"
                placeholder="••••••••"
                {...register("password", {
                  required: t("auth.passwordRequired"),
                  minLength: { value: 6, message: t("auth.passwordMinLength") },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="label">{t("auth.confirmPassword")}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                className="input-styled pl-12"
                placeholder="••••••••"
                {...register("confirmPassword", {
                  required: t("auth.confirmPasswordRequired"),
                  validate: (value) => value === password || t("auth.passwordsMismatch"),
                })}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="privacy"
              className="mt-1"
              {...register("privacy", { required: t("auth.privacyRequired") })}
            />
            <label htmlFor="privacy" className="text-sm text-gray-600">
              {t("auth.privacyText")}{" "}
              <Link href="/datenschutz" className="text-primary-600 hover:underline">
                {t("auth.privacyLink")}
              </Link>{" "}
              {t("auth.privacyText2")}
            </label>
          </div>
          {errors.privacy && (
            <p className="text-red-500 text-sm">{errors.privacy.message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 flex items-center justify-center text-lg font-semibold"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t("auth.registerButton")}
          </button>
        </form>

        {/* Google-Login mit IJP-Kontext, damit Studenten auch per Google als IJP-Student starten */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">{t("auth.orWithEmail", "oder")}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <GoogleLoginButton portal="ijp" />

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {t("auth.hasAccount")}{" "}
            <Link href="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
              {t("auth.login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function IjpRegisterPage() {
  return (
    <Suspense fallback={null}>
      <IjpRegisterPageInner />
    </Suspense>
  );
}
