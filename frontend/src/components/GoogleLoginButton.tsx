"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

interface GoogleLoginButtonProps {
  onSuccess?: (user: any) => void;
}

export default function GoogleLoginButton({ onSuccess }: GoogleLoginButtonProps) {
  const [googleConfig, setGoogleConfig] = useState<{ enabled: boolean; client_id?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [consent, setConsent] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);     // erst nach erkannter Neu-Registrierung
  const [pendingCredential, setPendingCredential] = useState<string | null>(null);
  const { setAuth } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    // 1) GSI-Script SOFORT laden (parallel zur Config) -> Button erscheint schneller
    if (typeof document !== "undefined" && !document.getElementById("google-gsi-script")) {
      const s = document.createElement("script");
      s.id = "google-gsi-script";
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      document.body.appendChild(s);
    }
    // 2) Client-ID bevorzugt aus Env (kein Backend-Roundtrip), sonst per API
    const envClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (envClientId) {
      setGoogleConfig({ enabled: true, client_id: envClientId });
      setLoading(false);
    } else {
      loadGoogleConfig();
    }
  }, []);

  useEffect(() => {
    if (googleConfig?.enabled && googleConfig?.client_id) {
      initGoogle();
    }
  }, [googleConfig]);

  const loadGoogleConfig = async () => {
    try {
      const response = await authAPI.getGoogleConfig();
      setGoogleConfig(response.data);
    } catch {
      setGoogleConfig({ enabled: false });
    } finally {
      setLoading(false);
    }
  };

  const submitGoogle = async (credential: string, accepted: boolean) => {
    setProcessing(true);
    try {
      const result = await authAPI.googleLogin(credential, accepted);
      const { access_token, user, is_new_user } = result.data;

      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
      setAuth(access_token, user);
      setNeedsConsent(false);
      setPendingCredential(null);

      if (user.role === "company") {
        toast.success(t("auth.loginSuccess"));
        router.push("/company/dashboard");
      } else if (user.role === "admin") {
        toast.success(t("auth.loginSuccess"));
        router.push("/admin/dashboard");
      } else if (is_new_user) {
        toast.success(t("auth.accountCreated"));
        router.push("/applicant/profile");
      } else {
        toast.success(t("auth.loginSuccess"));
        router.push("/applicant/applications");
      }

      if (onSuccess) onSuccess(user);
    } catch (error: any) {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      const detailStr = typeof detail === "string" ? detail : "";
      const isPrivacy =
        detail === "privacy_required" ||
        (status === 400 && (detailStr.toLowerCase().includes("datenschutz") || detailStr.toLowerCase().includes("privacy")));
      if (isPrivacy) {
        // Neuer Nutzer: Datenschutz-Zustimmung jetzt einblenden, Credential merken
        setPendingCredential(credential);
        setNeedsConsent(true);
      } else {
        toast.error(detailStr || t("auth.googleLoginFailed"));
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleGoogleResponse = async (response: { credential?: string }) => {
    if (!response.credential) {
      toast.error(t("auth.googleLoginFailed"));
      return;
    }
    await submitGoogle(response.credential, false);
  };

  const renderGoogleButton = () => {
    if (renderedRef.current || !window.google || !googleConfig?.client_id || !buttonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: googleConfig.client_id,
      callback: handleGoogleResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    // Breite nach Layout-Tick messen; wenn DOM noch nicht final (Breite 0), erneut versuchen
    let attempts = 0;
    const measure = () => {
      if (!buttonRef.current || !window.google) return;
      const containerWidth = Math.floor(buttonRef.current.getBoundingClientRect().width);
      if (containerWidth < 100 && attempts < 20) {
        attempts++;
        requestAnimationFrame(measure);
        return;
      }
      // Google erlaubt 200–400px; Container minus 8px Sicherheitsabstand, damit der
      // Button (inkl. Rand) garantiert hineinpasst und zentriert sitzt
      const width = Math.max(200, Math.min(400, (containerWidth || 360) - 8));
      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width,
        text: "continue_with",
        locale: "de",
        shape: "rectangular",
      });
      renderedRef.current = true;
    };

    // Zwei Frames warten damit das Layout stabil ist (nur EINMAL rendern – kein
    // Neu-Rendern bei Resize, das sonst zu falschen Breiten/abgeschnittenem Rand führt)
    requestAnimationFrame(() => requestAnimationFrame(measure));
  };

  const initGoogle = () => {
    if (document.getElementById("google-gsi-script")) {
      if (window.google) {
        renderGoogleButton();
      } else {
        const interval = setInterval(() => {
          if (window.google) {
            clearInterval(interval);
            renderGoogleButton();
          }
        }, 100);
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    document.body.appendChild(script);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-3">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!googleConfig?.enabled) return null;

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {processing ? (
        <div key="gsi-processing" className="flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-lg bg-gray-50 w-full max-w-[400px]">
          <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
          <span className="text-gray-600">{t("auth.signingIn")}</span>
        </div>
      ) : needsConsent ? (
        /* Neuer Nutzer erkannt -> jetzt Datenschutz-Zustimmung einblenden */
        <div key="gsi-consent" className="w-full max-w-[400px] flex flex-col gap-3 p-4 rounded-xl border border-primary-200 bg-primary-50/50">
          <p className="text-sm text-gray-700">{t("auth.googleNeedsConsent")}</p>
          <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 shrink-0"
            />
            <span>
              {t("auth.privacyText")}{" "}
              <Link href="/datenschutz" target="_blank" className="text-primary-600 hover:underline">
                {t("auth.privacyLink")}
              </Link>{" "}
              {t("auth.privacyText2")}
            </span>
          </label>
          <button
            type="button"
            disabled={!consent || !pendingCredential}
            onClick={() => pendingCredential && submitGoogle(pendingCredential, true)}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("auth.createAccount")}
          </button>
        </div>
      ) : (
        <div key="gsi-button" ref={buttonRef} className="w-full max-w-[400px] flex justify-center" style={{ minHeight: "44px" }} />
      )}
    </div>
  );
}
