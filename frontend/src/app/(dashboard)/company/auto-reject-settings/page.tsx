"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, Save, AlertTriangle, Filter, Target, Info } from "lucide-react";
import { companyAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface ScoreFilterSettings {
  enabled: boolean;
  threshold: number;
}

export default function ScoreFilterSettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<ScoreFilterSettings>({
    enabled: false,
    threshold: 50
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await companyAPI.getScoreFilterSettings();
      setSettings(response.data);
    } catch (error) {
      toast.error(t('scoreFilter.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await companyAPI.updateScoreFilterSettings(settings);
      toast.success(t('scoreFilter.saved'));
    } catch (error) {
      toast.error(t('scoreFilter.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <Link href="/company/settings" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6">
        <ArrowLeft className="h-4 w-4" />
        {t('scoreFilter.backToSettings')}
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary-100 rounded-xl">
          <Filter className="h-8 w-8 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('scoreFilter.title')}</h1>
          <p className="text-gray-600">{t('scoreFilter.subtitle')}</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">{t('scoreFilter.howItWorks')}</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>{t('scoreFilter.info1')}</li>
              <li>{t('scoreFilter.info2')}</li>
              <li>{t('scoreFilter.info3')}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Settings Card */}
      <div className="card">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-6">
          <div className="flex items-center gap-3">
            <Filter className={`h-5 w-5 ${settings.enabled ? "text-primary-600" : "text-gray-400"}`} />
            <div>
              <p className="font-medium text-gray-900">{t('scoreFilter.enableFilter')}</p>
              <p className="text-sm text-gray-500">{t('scoreFilter.enableFilterDesc')}</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
          </label>
        </div>

        {settings.enabled && (
          <div className="space-y-6">
            {/* Threshold Slider */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-5 w-5 text-gray-500" />
                <label className="font-medium text-gray-900">{t('scoreFilter.threshold')}</label>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                {t('scoreFilter.thresholdDesc', { threshold: settings.threshold })}
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={settings.threshold}
                  onChange={(e) => setSettings({ ...settings, threshold: parseInt(e.target.value) })}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <div className="w-16 text-center">
                  <span className="text-2xl font-bold text-primary-600">{settings.threshold}%</span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                <span>{t('scoreFilter.strict')} (10%)</span>
                <span>{t('scoreFilter.moderate')} (50%)</span>
                <span>{t('scoreFilter.loose')} (90%)</span>
              </div>
            </div>

            {/* Info */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div className="text-sm text-green-800">
                  <p className="font-medium">{t('scoreFilter.noteTitle')}</p>
                  <p>{t('scoreFilter.noteText')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-8 pt-6 border-t">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('common.saving')}
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {t('scoreFilter.saveSettings')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
