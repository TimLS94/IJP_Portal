"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Mail, Lock, User, Building2, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import GoogleLoginButton from "@/components/GoogleLoginButton";

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  privacy: boolean;
}

export default function RegisterPage() {
  const { registerApplicant, registerCompany } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceToken = searchParams.get("source");
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState<"applicant" | "company">("applicant");
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch("password");

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      if (userType === "applicant") {
        await registerApplicant(data.email, data.password, data.firstName!, data.lastName!, sourceToken);
        toast.success(t("auth.registrationSuccess"));
        router.push("/applicant/profile");
      } else {
        await registerCompany(data.email, data.password, data.companyName!);
        toast.success(t("auth.registrationSuccess"));
        router.push("/login");
      }
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
          <Link href="/" className="inline-block mb-4">
            <img src="/logo.png" alt="IJP" className="h-16 w-auto mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t("auth.register")}</h1>
          <p className="text-gray-600 mt-1">{t("auth.createAccount")}</p>
        </div>

          {/* User Type Selection – bei source-Link nur Bewerber anzeigen */}
          {!sourceToken && <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setUserType("applicant")}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                userType === "applicant"
                  ? "border-primary-500 bg-primary-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <User className={`h-8 w-8 mx-auto mb-2 ${
                userType === "applicant" ? "text-primary-600" : "text-gray-400"
              }`} />
              <span className={`block font-medium ${
                userType === "applicant" ? "text-primary-600" : "text-gray-600"
              }`}>{t("auth.applicant")}</span>
              <span className="text-xs text-gray-500">{t("auth.seekingJob")}</span>
              {userType === "applicant" && (
                <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-primary-600" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setUserType("company")}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                userType === "company"
                  ? "border-primary-500 bg-primary-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Building2 className={`h-8 w-8 mx-auto mb-2 ${
                userType === "company" ? "text-primary-600" : "text-gray-400"
              }`} />
              <span className={`block font-medium ${
                userType === "company" ? "text-primary-600" : "text-gray-600"
              }`}>{t("auth.company")}</span>
              <span className="text-xs text-gray-500">{t("auth.seekingEmployees")}</span>
              {userType === "company" && (
                <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-primary-600" />
              )}
            </button>
          </div>}

          {/* Google Login für Bewerber */}
          {userType === "applicant" && (
            <div className="mb-6">
              <GoogleLoginButton />
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">{t("auth.orWithEmail")}</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {userType === "applicant" ? (
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
            ) : (
              <div>
                <label className="label">{t("auth.companyName")}</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    className="input-styled pl-12"
                    placeholder="Muster GmbH"
                    {...register("companyName", { required: t("auth.companyNameRequired") })}
                  />
                </div>
                {errors.companyName && (
                  <p className="text-red-500 text-sm mt-1">{errors.companyName.message}</p>
                )}
              </div>
            )}

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
