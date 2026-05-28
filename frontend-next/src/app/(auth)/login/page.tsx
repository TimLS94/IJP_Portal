"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const user = await login(data.email, data.password);
      toast.success(t("auth.loginSuccess"));

      if (user.role === "applicant") {
        router.push("/applicant/profile");
      } else if (user.role === "company") {
        router.push("/company/dashboard");
      } else if (user.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/");
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      const errorDetail = err.response?.data?.detail;

      if (errorDetail === "Benutzer ist deaktiviert") {
        toast.error(t("auth.accountNotActivated"), { duration: 6000 });
      } else {
        toast.error(errorDetail || t("auth.loginFailed"));
      }
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
          <h1 className="text-2xl font-bold text-gray-900">{t("auth.login")}</h1>
          <p className="text-gray-600 mt-1">{t("auth.welcomeBack")}</p>
        </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t("auth.email")}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  className="input-styled pl-12"
                  placeholder="your@email.com"
                  autoComplete="email"
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
                <p className="text-red-500 text-sm mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t("auth.password")}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {t("auth.forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="input-styled pl-12 pr-12"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register("password", {
                    required: t("auth.passwordRequired"),
                    minLength: {
                      value: 6,
                      message: t("auth.passwordMinLength"),
                    },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center text-lg font-semibold"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                t("auth.login")
              )}
            </button>
          </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {t("auth.noAccount")}{" "}
            <Link href="/register" className="text-primary-600 hover:text-primary-700 font-semibold">
              {t("auth.register")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
