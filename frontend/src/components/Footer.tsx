"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Company Info */}
          <div>
            <img 
              src="/logo.png" 
              alt="JobOn Logo" 
              className="h-10 w-auto mb-4 brightness-0 invert"
            />
            <p className="text-sm text-gray-400 mb-4">
              {t("footer.description")}
            </p>
            <div className="space-y-2 text-sm">
              <p className="text-xs text-gray-500 mb-2">{t("footer.serviceBy")}</p>
              <p className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary-400" />
                <span>
                  IJP International Job Placement UG<br />
                  Husemannstr. 9<br />
                  10435 Berlin
                </span>
              </p>
            </div>
          </div>

          {/* For Applicants */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t("footer.forApplicants")}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/jobs" className="hover:text-primary-400 transition-colors">
                  {t("nav.jobs")}
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-primary-400 transition-colors">
                  {t("nav.register")}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-primary-400 transition-colors">
                  {t("nav.faq")}
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-primary-400 transition-colors">
                  {t("nav.about")}
                </Link>
              </li>
            </ul>
          </div>

          {/* For Companies */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t("footer.forCompanies")}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/register/company" className="hover:text-primary-400 transition-colors">
                  {t("nav.register")}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-primary-400 transition-colors">
                  {t("nav.faq")}
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-primary-400 transition-colors">
                  {t("nav.about")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t("footer.legal")}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/contact" className="hover:text-primary-400 transition-colors">
                  {t("nav.contact")}
                </Link>
              </li>
              <li>
                <Link href="/impressum" className="hover:text-primary-400 transition-colors">
                  {t("footer.imprint")}
                </Link>
              </li>
              <li>
                <Link href="/datenschutz" className="hover:text-white transition-colors">
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link href="/agb" className="hover:text-white transition-colors">
                  {t("footer.terms")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
