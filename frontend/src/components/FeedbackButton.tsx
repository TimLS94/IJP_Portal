"use client";

import { useState } from "react";
import { MessageCircle, X, Send, Bug, Lightbulb, HelpCircle, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";

const FEEDBACK_TYPE_IDS = ["bug", "idea", "question"] as const;
type FeedbackTypeId = typeof FEEDBACK_TYPE_IDS[number];

const FEEDBACK_ICONS: Record<FeedbackTypeId, React.ComponentType<{ className?: string }>> = {
  bug: Bug,
  idea: Lightbulb,
  question: HelpCircle,
};

const FEEDBACK_COLORS: Record<FeedbackTypeId, string> = {
  bug: "text-red-600 bg-red-50",
  idea: "text-yellow-600 bg-yellow-50",
  question: "text-blue-600 bg-blue-50",
};

export default function FeedbackButton() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackTypeId | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error(t("feedbackWidget.errorEmpty"));
      return;
    }

    setSending(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ijp-portal.onrender.com/api/v1";
      const response = await fetch(`${API_URL}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: feedbackType,
          message: message.trim(),
          page_url: window.location.href,
          user_email: user?.email || null,
          user_agent: navigator.userAgent,
        }),
      });

      if (response.ok) {
        setSent(true);
        setTimeout(() => {
          setIsOpen(false);
          setSent(false);
          setFeedbackType(null);
          setMessage("");
        }, 2000);
      } else {
        const subject = encodeURIComponent(`[${feedbackType}] Feedback von ${user?.email || "Anonym"}`);
        const body = encodeURIComponent(`${message}\n\n---\nSeite: ${window.location.href}`);
        window.location.href = `mailto:info@jobon.work?subject=${subject}&body=${body}`;
        toast.success(t("feedbackWidget.emailFallback"));
        setIsOpen(false);
      }
    } catch {
      const subject = encodeURIComponent(`[${feedbackType}] Feedback von ${user?.email || "Anonym"}`);
      const body = encodeURIComponent(`${message}\n\n---\nSeite: ${window.location.href}`);
      window.location.href = `mailto:info@jobon.work?subject=${subject}&body=${body}`;
      toast.success(t("feedbackWidget.emailFallback"));
      setIsOpen(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-40 w-12 h-12 bg-gray-700 hover:bg-gray-800 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 group"
        title={t("feedbackWidget.buttonTooltip")}
      >
        <MessageCircle className="h-5 w-5" />
        <span className="absolute left-14 bg-gray-800 text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {t("feedbackWidget.buttonLabel")}
        </span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">{t("feedbackWidget.title")}</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {sent ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900">{t("feedbackWidget.successTitle")}</p>
                  <p className="text-gray-600 text-sm">{t("feedbackWidget.successDesc")}</p>
                </div>
              ) : !feedbackType ? (
                <div className="space-y-3">
                  <p className="text-gray-600 text-sm mb-4">{t("feedbackWidget.intro")}</p>
                  {FEEDBACK_TYPE_IDS.map((id) => {
                    const Icon = FEEDBACK_ICONS[id];
                    return (
                      <button
                        key={id}
                        onClick={() => setFeedbackType(id)}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 border-transparent hover:border-gray-200 transition-all ${FEEDBACK_COLORS[id]}`}
                      >
                        <Icon className="h-6 w-6" />
                        <span className="font-medium text-gray-900">{t(`feedbackWidget.types.${id}`)}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={() => setFeedbackType(null)}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    {t("feedbackWidget.back")}
                  </button>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t(`feedbackWidget.labels.${feedbackType}`)}
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t(`feedbackWidget.placeholders.${feedbackType}`)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                      rows={4}
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Aktuelle Seite: {typeof window !== "undefined" ? window.location.pathname : ""}
                  </p>
                  <button
                    onClick={handleSubmit}
                    disabled={sending || !message.trim()}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("feedbackWidget.submitting")}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        {t("feedbackWidget.submit")}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
