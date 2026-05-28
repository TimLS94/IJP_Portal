"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { accountAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface ForgotPasswordForm {
  email: string;
}

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>();

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    try {
      await accountAPI.forgotPassword(data.email);
      setIsSubmitted(true);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('forgotPassword.sendError'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('forgotPassword.emailSent')}</h2>
            <p className="text-gray-600 mb-6">
              {t('forgotPassword.emailSentDescription')}
            </p>
            <Link href="/login" className="btn-primary inline-block">
              {t('forgotPassword.backToLogin')}
            </Link>
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
              <Mail className="h-8 w-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t('forgotPassword.title')}</h1>
            <p className="text-gray-600 mt-2">
              {t('forgotPassword.description')}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="label">{t('auth.email')}</label>
              <input
                type="email"
                className={`input ${errors.email ? "border-red-500" : ""}`}
                placeholder={t('forgotPassword.emailPlaceholder')}
                {...register("email", {
                  required: t('auth.emailRequired'),
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: t('auth.invalidEmail')
                  }
                })}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? t('forgotPassword.sending') : t('forgotPassword.sendLink')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-primary-600 hover:text-primary-700 flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('forgotPassword.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
