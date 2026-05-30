"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Plus, Edit, Trash2, Eye, Sparkles, Loader2 } from "lucide-react";
import { blogAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  status: string;
  is_published: boolean;
  category: string;
  created_at: string;
  view_count: number;
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const response = await blogAPI.adminGetPosts({});
      setPosts(response.data?.posts || response.data || []);
    } catch (error) {
      toast.error("Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Artikel wirklich löschen?")) return;
    try {
      await blogAPI.adminDeletePost(id);
      toast.success("Artikel gelöscht");
      loadPosts();
    } catch (error) {
      toast.error("Fehler beim Löschen");
    }
  };

  const handleTogglePublish = async (id: number, currentStatus: boolean) => {
    try {
      await blogAPI.adminTogglePublish(id);
      toast.success(currentStatus ? "Artikel versteckt" : "Artikel veröffentlicht");
      loadPosts();
    } catch (error) {
      toast.error("Fehler beim Ändern des Status");
    }
  };

  const handleAiGenerate = async () => {
    if (!confirm("Claude schreibt jetzt automatisch einen neuen Blog-Artikel und veröffentlicht ihn sofort. Fortfahren?")) return;
    setGenerating(true);
    try {
      const response = await blogAPI.adminAiGenerate();
      toast.success(`✨ Artikel "${response.data.title}" wurde veröffentlicht!`);
      loadPosts();
    } catch {
      toast.error("Fehler beim Generieren. ANTHROPIC_API_KEY in Render gesetzt?");
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Blog verwalten</h1>
            <p className="text-gray-600">{posts.length} Artikel</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAiGenerate}
            disabled={generating}
            className="btn-secondary flex items-center gap-2"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generating ? "Claude schreibt..." : "KI-Artikel generieren"}
          </button>
          <Link href="/admin/blog/new" className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Neuer Artikel
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">Keine Artikel vorhanden</div>
      ) : (
        <>
          {/* Mobile: Card layout */}
          <div className="md:hidden space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="card p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="font-medium text-gray-900 text-sm leading-snug flex-1">{post.title}</p>
                  <button
                    onClick={() => handleTogglePublish(post.id, post.is_published)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                      post.is_published ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {post.is_published ? "Veröffentlicht" : "Entwurf"}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 space-x-3">
                    <span>{post.category}</span>
                    <span>{post.view_count} Aufrufe</span>
                    <span>{formatDate(post.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={`/blog/${post.slug}`} className="p-2 text-gray-400 hover:text-primary-600">
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link href={`/admin/blog/${post.id}/edit`} className="p-2 text-gray-400 hover:text-primary-600">
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button onClick={() => handleDelete(post.id)} className="p-2 text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategorie</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aufrufe</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{post.title}</td>
                    <td className="px-6 py-4 text-gray-600">{post.category}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleTogglePublish(post.id, post.is_published)}
                        className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                          post.is_published ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}
                        title={post.is_published ? "Klicken zum Verstecken" : "Klicken zum Veröffentlichen"}
                      >
                        {post.is_published ? "Veröffentlicht" : "Entwurf"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{post.view_count}</td>
                    <td className="px-6 py-4 text-gray-600">{formatDate(post.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/blog/${post.slug}`} className="p-2 text-gray-400 hover:text-primary-600">
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link href={`/admin/blog/${post.id}/edit`} className="p-2 text-gray-400 hover:text-primary-600">
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button onClick={() => handleDelete(post.id)} className="p-2 text-gray-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
