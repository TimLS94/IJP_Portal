"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle,
  Users,
  Briefcase,
  Star,
  Phone,
  Globe,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ArbeitgeberPage() {
  const { t } = useTranslation();

  const selfServiceBenefits = [
    t("arbeitgeber.selfService.b1"),
    t("arbeitgeber.selfService.b2"),
    t("arbeitgeber.selfService.b3"),
    t("arbeitgeber.selfService.b4"),
    t("arbeitgeber.selfService.b5"),
  ];

  const ijpServiceBenefits = [
    t("arbeitgeber.ijpService.b1"),
    t("arbeitgeber.ijpService.b2"),
    t("arbeitgeber.ijpService.b3"),
    t("arbeitgeber.ijpService.b4"),
    t("arbeitgeber.ijpService.b5"),
  ];

  const steps = [
    {
      icon: Building2,
      title: t("arbeitgeber.steps.s1Title"),
      desc: t("arbeitgeber.steps.s1Desc"),
    },
    {
      icon: Briefcase,
      title: t("arbeitgeber.steps.s2Title"),
      desc: t("arbeitgeber.steps.s2Desc"),
    },
    {
      icon: Users,
      title: t("arbeitgeber.steps.s3Title"),
      desc: t("arbeitgeber.steps.s3Desc"),
    },
    {
      icon: Star,
      title: t("arbeitgeber.steps.s4Title"),
      desc: t("arbeitgeber.steps.s4Desc"),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white rounded-3xl p-8 md:p-12 lg:p-16 mb-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-700 text-blue-100 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Globe className="h-4 w-4" />
            {t("arbeitgeber.hero.badge")}
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            {t("arbeitgeber.hero.title")}
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            {t("arbeitgeber.hero.subtitle")}
          </p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-8 text-sm">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              {t("arbeitgeber.hero.badge1")}
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              {t("arbeitgeber.hero.badge2")}
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              {t("arbeitgeber.hero.badge3")}
            </span>
          </div>
        </div>
      </section>

      {/* Two Options */}
      <section className="mb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 text-center">
          {t("arbeitgeber.options.title")}
        </h2>
        <p className="text-gray-600 text-center mb-10">
          {t("arbeitgeber.options.subtitle")}
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Option A: Self-service */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-2xl p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-blue-600 rounded-xl">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                  {t("arbeitgeber.selfService.tag")}
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {t("arbeitgeber.selfService.title")}
                </h3>
              </div>
            </div>
            <p className="text-gray-700 mb-6 mt-2">
              {t("arbeitgeber.selfService.desc")}
            </p>
            <ul className="space-y-3 mb-8 flex-grow">
              {selfServiceBenefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-700">
                  <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
            <div className="space-y-3">
              <Link
                href="/register/company"
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
              >
                {t("arbeitgeber.selfService.cta")}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="text-center text-sm text-gray-500">
                {t("arbeitgeber.selfService.note")}
              </p>
            </div>
          </div>

          {/* Option B: IJP full service */}
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-300 rounded-2xl p-8 flex flex-col relative">
            <div className="absolute -top-3 right-6 bg-primary-600 text-white px-4 py-1 rounded-full text-xs font-bold">
              {t("arbeitgeber.ijpService.badge")}
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary-600 rounded-xl">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-xs font-semibold text-primary-600 uppercase tracking-wide">
                  {t("arbeitgeber.ijpService.tag")}
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {t("arbeitgeber.ijpService.title")}
                </h3>
              </div>
            </div>
            <p className="text-gray-700 mb-6 mt-2">
              {t("arbeitgeber.ijpService.desc")}
            </p>
            <ul className="space-y-3 mb-8 flex-grow">
              {ijpServiceBenefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-700">
                  <CheckCircle className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
            <div className="space-y-3">
              <Link
                href="/contact"
                className="w-full inline-flex items-center justify-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-700 transition-all"
              >
                {t("arbeitgeber.ijpService.cta")}
                <Phone className="h-5 w-5" />
              </Link>
              <p className="text-center text-sm text-gray-500">
                {t("arbeitgeber.ijpService.note")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Steps for self-service */}
      <section className="mb-16 bg-gray-50 rounded-3xl p-8 md:p-12">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 text-center">
          {t("arbeitgeber.steps.title")}
        </h2>
        <p className="text-gray-600 text-center mb-10">
          {t("arbeitgeber.steps.subtitle")}
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-white rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow h-full">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex justify-center mb-4 mt-2">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <step.icon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-8 md:p-12 text-center text-white">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          {t("arbeitgeber.finalCta.title")}
        </h2>
        <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
          {t("arbeitgeber.finalCta.desc")}
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link
            href="/register/company"
            className="bg-white text-blue-700 px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg flex items-center gap-2"
          >
            {t("arbeitgeber.finalCta.register")}
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/contact"
            className="bg-blue-500 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold hover:bg-blue-400 transition-all border-2 border-blue-400 flex items-center gap-2"
          >
            {t("arbeitgeber.finalCta.contact")}
            <Phone className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
