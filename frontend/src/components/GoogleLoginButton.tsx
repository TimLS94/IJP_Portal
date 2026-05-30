"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
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
  const { setAuth } = useAuth();
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    loadGoogleConfig();
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

  const handleGoogleResponse = async (response: { credential?: string }) => {
    if (!response.credential) {
      toast.error("Google Login fehlgeschlagen");
      return;
    }
    setProcessing(true);
    try {
      const result = await authAPI.googleLogin(response.credential);
      const { access_token, user, is_new_user } = result.data;

      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
      setAuth(access_token, user);

      if (user.role === "company") {
        toast.success("Erfolgreich angemeldet!");
        router.push("/company/dashboard");
      } else if (user.role === "admin") {
        toast.success("Erfolgreich angemeldet!");
        router.push("/admin/dashboard");
      } else if (is_new_user) {
        toast.success("Willkommen! Dein Konto wurde erstellt.");
        router.push("/applicant/profile");
      } else {
        toast.success("Erfolgreich angemeldet!");
        router.push("/applicant/applications");
      }

      if (onSuccess) onSuccess(user);
    } catch (error: any) {
      const message = error.response?.data?.detail || "Google Login fehlgeschlagen";
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  const renderGoogleButton = () => {
    if (renderedRef.current || !window.google || !googleConfig?.client_id || !buttonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: googleConfig.client_id,
      callback: handleGoogleResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    // Breite nach Layout-Tick messen (offsetWidth ist 0 wenn DOM noch nicht final ist)
    const measure = () => {
      if (!buttonRef.current) return;
      const containerWidth = buttonRef.current.getBoundingClientRect().width;
      // Google erlaubt 200–400px; wir nehmen den Container, gedeckelt auf 400
      const width = Math.max(200, Math.min(400, Math.round(containerWidth) || 400));
      window.google!.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width,
        text: "continue_with",
        locale: "de",
        shape: "rectangular",
      });
      renderedRef.current = true;
    };

    // Zwei Frames warten damit das Layout stabil ist
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
    <div className="w-full flex justify-center">
      {processing ? (
        <div className="flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-lg bg-gray-50 w-full max-w-[400px]">
          <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
          <span className="text-gray-600">Wird angemeldet...</span>
        </div>
      ) : (
        <div ref={buttonRef} style={{ minHeight: "44px" }} />
      )}
    </div>
  );
}
