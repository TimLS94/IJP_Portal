"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TrendingUp, Users, ArrowRight, FileText, Loader2, Mail, Rocket } from "lucide-react";
import { adminAPI } from "@/lib/api";

interface FacebookStats {
  total_groups: number;
  total_posts: number;
  favorite_posts: number;
  total_posted: number;
}

export default function AdminSalesPage() {
  const [stats, setStats] = useState<FacebookStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await adminAPI.getFacebookStats();
      setStats(response.data);
    } catch (error) {
      console.error("Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary-100 rounded-xl">
          <TrendingUp className="h-6 w-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vertrieb</h1>
          <p className="text-sm text-gray-500">Outreach und Marketing verwalten</p>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-4">
            <p className="text-2xl font-bold text-blue-600">{stats.total_groups}</p>
            <p className="text-sm text-gray-500">FB Gruppen</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-purple-600">{stats.total_posts}</p>
            <p className="text-sm text-gray-500">FB Posts</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-yellow-600">{stats.favorite_posts}</p>
            <p className="text-sm text-gray-500">Favoriten</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-green-600">{stats.total_posted}</p>
            <p className="text-sm text-gray-500">Gepostet</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <h2 className="font-semibold text-gray-700 mb-3">E-Mail Outreach</h2>
      <div className="space-y-3 mb-6">
        <Link href="/admin/sales/cold-outreach" className="card p-4 hover:shadow-lg transition-shadow group block">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Kaltakquise E-Mails</h3>
                <p className="text-sm text-gray-500">E-Mail-Kampagnen für Firmenakquise</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
          </div>
        </Link>

        <Link href="/admin/sales/boost-emails" className="card p-4 hover:shadow-lg transition-shadow group block">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Rocket className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Boost-E-Mails</h3>
                <p className="text-sm text-gray-500">Geboostete Stellen an passende Bewerber mailen</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
          </div>
        </Link>
      </div>

      <h2 className="font-semibold text-gray-700 mb-3">Facebook Marketing</h2>
      <div className="space-y-3">
        <Link href="/admin/sales/facebook-boost" className="card p-4 hover:shadow-lg transition-shadow group block">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Rocket className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Boost → Facebook-Posts</h3>
                <p className="text-sm text-gray-500">Geboostete Stellen als fertige DE/ES-Posts</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
          </div>
        </Link>

        <Link href="/admin/sales/facebook-groups" className="card p-4 hover:shadow-lg transition-shadow group block">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Facebook Gruppen</h3>
                <p className="text-sm text-gray-500">Gruppen nach Sprache/Kategorie verwalten</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
          </div>
        </Link>

        <Link href="/admin/sales/facebook-posts" className="card p-4 hover:shadow-lg transition-shadow group block">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Facebook Posts</h3>
                <p className="text-sm text-gray-500">Post-Vorlagen erstellen und verwalten</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  );
}
