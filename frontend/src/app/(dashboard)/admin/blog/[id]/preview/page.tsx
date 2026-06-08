"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { blogAPI } from "@/lib/api";
import BlogDetailClient from "@/app/(public)/blog/[slug]/BlogDetailClient";
import { ArrowLeft, Loader2, AlertCircle, PenLine } from "lucide-react";

export default function BlogPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    blogAPI
      .adminGetPost(id)
      .then((res: { data: unknown }) => setPost(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-500">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p>Artikel konnte nicht geladen werden.</p>
        <Link href="/admin/blog" className="btn-secondary">
          Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  const language: "de" | "en" | "es" =
    post.language === "en" ? "en" : post.language === "es" ? "es" : "de";

  return (
    <div>
      {/* Vorschau-Banner */}
      <div className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-amber-500 text-white px-4 py-2 shadow-md text-sm font-medium">
        <div className="flex items-center gap-2">
          <span className="bg-white text-amber-600 px-2 py-0.5 rounded font-bold text-xs uppercase tracking-wide">
            Vorschau
          </span>
          {!post.is_published && (
            <span className="opacity-90">
              Entwurf — nicht öffentlich sichtbar
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/blog/${id}/edit`}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors"
          >
            <PenLine className="h-4 w-4" />
            Bearbeiten
          </Link>
          <Link
            href="/admin/blog"
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Übersicht
          </Link>
        </div>
      </div>

      {/* Blog-Inhalt (identisch mit öffentlicher Ansicht) */}
      <BlogDetailClient post={post} relatedPosts={[]} language={language} />
    </div>
  );
}
