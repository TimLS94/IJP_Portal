"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Lock, CheckCircle, XCircle } from "lucide-react";
import { accountAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetPasswordForm>();
  const password = watch("password");

  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      await accountAPI.verifyResetToken(token);
      setIsValidToken(true);
    } catch {
      setIsValidToken(false);
    }
  };

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      await accountAPI.resetPassword(token, data.password);
      setIsSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Fehler beim Zurücksetzen");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ungültiger Link</h2>
            <p className="text-gray-600 mb-6">Der Link ist ungültig oder abgelaufen.</p>
            <Link href="/forgot-password" className="btn-primary inline-block">
              Neuen Link anfordern
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Link abgelaufen</h2>
            <p className="text-gray-600 mb-6">Dieser Link ist nicht mehr gültig.</p>
            <Link href="/forgot-password" className="btn-primary inline-block">
              Neuen Link anfordern
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Passwort geändert!</h2>
            <p className="text-gray-600 mb-6">Sie werden zum Login weitergeleitet...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Neues Passwort</h1>
            <p className="text-gray-600 mt-2">Geben Sie Ihr neues Passwort ein.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="label">Neues Passwort</label>
              <input
                type="password"
                className={`input ${errors.password ? "border-red-500" : ""}`}
                {...register("password", {
                  required: "Passwort ist erforderlich",
                  minLength: { value: 8, message: "Mindestens 8 Zeichen" }
                })}
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="label">Passwort bestätigen</label>
              <input
                type="password"
                className={`input ${errors.confirmPassword ? "border-red-500" : ""}`}
                {...register("confirmPassword", {
                  required: "Bitte bestätigen Sie das Passwort",
                  validate: value => value === password || "Passwörter stimmen nicht überein"
                })}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? "Wird gespeichert..." : "Passwort ändern"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
