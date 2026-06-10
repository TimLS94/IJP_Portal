"use client";

import Link from "next/link";
import { ArrowRight, Briefcase, Users, Building2, FileCheck, CheckCircle, Send, UserCheck, Handshake, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";

export default function HomeClient() {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const positionTypes = [
    { id: 'studentenferienjob', key: 'positionTypes.studentenferienjob', color: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200', icon: '🎓' },
    { id: 'saisonjob', key: 'positionTypes.saisonjob', color: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200', icon: '🌾' },
    { id: 'workandholiday', key: 'positionTypes.workandholiday', color: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200', icon: '✈️' },
    { id: 'fachkraft', key: 'positionTypes.fachkraft', color: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200', icon: '👔' },
    { id: 'ausbildung', key: 'positionTypes.ausbildung', color: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200', icon: '📚' }
  ];

  const howItWorksSteps = [
    { icon: Send, titleKey: "home.howItWorks.step1Title", descKey: "home.howItWorks.step1Desc" },
    { icon: UserCheck, titleKey: "home.howItWorks.step2Title", descKey: "home.howItWorks.step2Desc" },
    { icon: Users, titleKey: "home.howItWorks.step3Title", descKey: "home.howItWorks.step3Desc" },
    { icon: Handshake, titleKey: "home.howItWorks.step4Title", descKey: "home.howItWorks.step4Desc" },
  ];

  const faqs = [
    { questionKey: "home.faq.q1", answerKey: "home.faq.a1" },
    { questionKey: "home.faq.q2", answerKey: "home.faq.a2" },
    { questionKey: "home.faq.q3", answerKey: "home.faq.a3" },
    { questionKey: "home.faq.q4", answerKey: "home.faq.a4" },
    { questionKey: "home.faq.q5", answerKey: "home.faq.a5" },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section - SEO optimiert */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-primary-900 text-white rounded-3xl p-8 md:p-12 lg:p-16 mb-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight [hyphens:none]">
            {t("home.title")}
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            {t("home.subtitle")}
          </p>
          
          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-8 text-sm md:text-base">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              {t("home.trustBadge1")}
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              {t("home.trustBadge2")}
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              {t("home.trustBadge3")}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link 
              href="/arbeitgeber" 
              className="bg-white text-gray-900 px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              {t("home.ctaEmployer")}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link 
              href="/jobs" 
              className="bg-primary-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold hover:bg-primary-500 transition-all border-2 border-primary-500 flex items-center gap-2"
            >
              {t("home.ctaApplicant")}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Audience Split - Arbeitgeber / Bewerber */}
      <section className="mb-16">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Für Arbeitgeber */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-6 md:p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-600 rounded-xl">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">{t("home.employer.title")}</h2>
            </div>
            <p className="text-gray-700 mb-6">{t("home.employer.description")}</p>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2 text-gray-700">
                <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                {t("home.employer.benefit1")}
              </li>
              <li className="flex items-center gap-2 text-gray-700">
                <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                {t("home.employer.benefit2")}
              </li>
              <li className="flex items-center gap-2 text-gray-700">
                <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                {t("home.employer.benefit3")}
              </li>
            </ul>
            <Link 
              href="/arbeitgeber" 
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
            >
              {t("home.employer.cta")}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          {/* Für Bewerber */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-2xl p-6 md:p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-600 rounded-xl">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">{t("home.applicant.title")}</h2>
            </div>
            <p className="text-gray-700 mb-6">{t("home.applicant.description")}</p>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2 text-gray-700">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                {t("home.applicant.benefit1")}
              </li>
              <li className="flex items-center gap-2 text-gray-700">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                {t("home.applicant.benefit2")}
              </li>
              <li className="flex items-center gap-2 text-gray-700">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                {t("home.applicant.benefit3")}
              </li>
            </ul>
            <Link 
              href="/jobs" 
              className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-all"
            >
              {t("home.applicant.cta")}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Position Types */}
      <section className="mb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 text-center">{t("home.jobTypes")}</h2>
        <p className="text-gray-600 text-center mb-8">{t("home.selectJobType")}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {positionTypes.map((type) => (
            <Link
              key={type.id}
              href={`/jobs?type=${type.id}`}
              className={`${type.color} p-4 md:p-6 rounded-xl text-center border-2 transition-all hover:shadow-lg hover:scale-105 flex flex-col items-center justify-center gap-2`}
            >
              <span className="text-2xl">{type.icon}</span>
              <span className="font-bold text-sm md:text-base leading-tight [hyphens:none]">{t(type.key)}</span>
            </Link>
          ))}
        </div>
        <p className="text-center mt-4">
          <Link href="/stellenarten" className="text-primary-600 hover:text-primary-700 font-medium">
            → {t("home.allJobTypesExplained")}
          </Link>
        </p>
      </section>

      {/* So funktioniert's */}
      <section className="mb-16 bg-gray-50 rounded-3xl p-8 md:p-12">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 text-center">{t("home.howItWorks.title")}</h2>
        <p className="text-gray-600 text-center mb-10">{t("home.howItWorks.subtitle")}</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {howItWorksSteps.map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-white rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow h-full">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex justify-center mb-4 mt-2">
                  <div className="p-3 bg-primary-100 rounded-xl">
                    <step.icon className="h-6 w-6 text-primary-600" />
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{t(step.titleKey)}</h3>
                <p className="text-sm text-gray-600">{t(step.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Warum JobOn - Trust Section */}
      <section className="mb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 text-center">{t("home.whyJobon.title")}</h2>
        <p className="text-gray-600 text-center mb-10">{t("home.whyJobon.subtitle")}</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card text-center hover:shadow-lg transition-shadow">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-green-100 rounded-xl">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">{t("home.whyJobon.free")}</h3>
            <p className="text-sm text-gray-600">{t("home.whyJobon.freeDesc")}</p>
          </div>
          <div className="card text-center hover:shadow-lg transition-shadow">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-blue-100 rounded-xl">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">{t("home.whyJobon.personal")}</h3>
            <p className="text-sm text-gray-600">{t("home.whyJobon.personalDesc")}</p>
          </div>
          <div className="card text-center hover:shadow-lg transition-shadow">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-purple-100 rounded-xl">
                <FileCheck className="h-8 w-8 text-purple-600" />
              </div>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">{t("home.whyJobon.visa")}</h3>
            <p className="text-sm text-gray-600">{t("home.whyJobon.visaDesc")}</p>
          </div>
          <div className="card text-center hover:shadow-lg transition-shadow">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-orange-100 rounded-xl">
                <Building2 className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">{t("home.whyJobon.partners")}</h3>
            <p className="text-sm text-gray-600">{t("home.whyJobon.partnersDesc")}</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 text-center">{t("home.faq.title")}</h2>
        <p className="text-gray-600 text-center mb-10">{t("home.faq.subtitle")}</p>
        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900">{t(faq.questionKey)}</span>
                <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === index && (
                <div className="px-6 pb-4 text-gray-600">
                  {t(faq.answerKey)}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-center mt-6">
          <Link href="/faq" className="text-primary-600 hover:text-primary-700 font-medium">
            → {t("home.faq.moreQuestions")}
          </Link>
        </p>
      </section>

      {/* Final CTA Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-3xl p-8 md:p-12 text-center text-white">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">{t("home.finalCta.title")}</h2>
        <p className="text-primary-100 mb-8 max-w-2xl mx-auto">
          {t("home.finalCta.description")}
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link href="/arbeitgeber" className="bg-white text-primary-600 px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg">
            {t("home.finalCta.employer")}
          </Link>
          <Link href="/register" className="bg-primary-500 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold hover:bg-primary-400 transition-all border-2 border-primary-400">
            {t("home.finalCta.applicant")}
          </Link>
        </div>
      </section>
    </div>
  );
}
