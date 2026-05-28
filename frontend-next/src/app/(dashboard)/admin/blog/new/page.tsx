"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FileText, ArrowLeft, Save, Newspaper, Lightbulb, Briefcase, FileCheck, Home, Trophy, Building2 } from "lucide-react";
import Link from "next/link";
import { blogAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface BlogForm {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category: string;
  featured_image: string;
  meta_title: string;
  meta_description: string;
  status: string;
}

const categories = [
  { value: "news", label: "Neuigkeiten", icon: Newspaper },
  { value: "tips", label: "Tipps & Tricks", icon: Lightbulb },
  { value: "career", label: "Karriere-Ratgeber", icon: Briefcase },
  { value: "visa", label: "Visa & Arbeitserlaubnis", icon: FileCheck },
  { value: "living", label: "Leben in Deutschland", icon: Home },
  { value: "success_stories", label: "Erfolgsgeschichten", icon: Trophy },
  { value: "company", label: "Für Unternehmen", icon: Building2 },
];

export default function NewBlogPostPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<BlogForm>({
    defaultValues: {
      status: "draft",
      category: "news",
    },
  });

  const onSubmit = async (data: BlogForm) => {
    setIsLoading(true);
    try {
      await blogAPI.adminCreatePost(data);
      toast.success("Artikel erstellt!");
      router.push("/admin/blog");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Fehler beim Erstellen");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/admin/blog" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Übersicht
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <FileText className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Neuer Artikel</h1>
          <p className="text-gray-600">Erstellen Sie einen neuen Blog-Artikel</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Hauptinhalt */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="space-y-4">
                <div>
                  <label className="label">Titel *</label>
                  <input
                    type="text"
                    className={`input ${errors.title ? "border-red-500" : ""}`}
                    {...register("title", { required: "Titel ist erforderlich" })}
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                </div>

                <div>
                  <label className="label">Slug *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="url-freundlicher-name"
                    {...register("slug", { required: true })}
                  />
                </div>

                <div>
                  <label className="label">Kurzfassung</label>
                  <textarea
                    className="input min-h-[100px]"
                    placeholder="Kurze Zusammenfassung für Vorschau..."
                    {...register("excerpt")}
                  />
                </div>

                <div>
                  <label className="label">Inhalt *</label>
                  <textarea
                    className="input min-h-[400px] font-mono text-sm"
                    placeholder="Artikel-Inhalt (Markdown unterstützt)..."
                    {...register("content", { required: true })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seitenleiste */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="font-semibold mb-4">Einstellungen</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Kategorie</label>
                  <select className="input" {...register("category")}>
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Beitragsbild URL</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="https://..."
                    {...register("featured_image")}
                  />
                </div>

                <div>
                  <label className="label">Status</label>
                  <select className="input" {...register("status")}>
                    <option value="draft">Entwurf</option>
                    <option value="published">Veröffentlicht</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold mb-4">SEO</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Meta-Titel</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="SEO-Titel"
                    {...register("meta_title")}
                  />
                </div>

                <div>
                  <label className="label">Meta-Beschreibung</label>
                  <textarea
                    className="input min-h-[80px]"
                    placeholder="SEO-Beschreibung..."
                    {...register("meta_description")}
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2">
              <Save className="h-4 w-4" />
              {isLoading ? "Wird erstellt..." : "Artikel erstellen"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
