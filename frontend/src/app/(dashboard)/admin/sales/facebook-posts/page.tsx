"use client";

import { useState, useEffect } from "react";
import { 
  FileText, Plus, Trash2, Edit2, Check, X, Star, Copy,
  Loader2, MessageSquare, Clock, ChevronDown, Search, ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { adminAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface FacebookPost {
  id: number;
  title?: string;
  content: string;
  is_favorite: boolean;
  times_used: number;
  created_at: string;
}

interface NewPost {
  title: string;
  content: string;
  is_favorite: boolean;
}

export default function FacebookPostsPage() {
  const [posts, setPosts] = useState<FacebookPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPost, setEditingPost] = useState<FacebookPost | null>(null);
  const [newPost, setNewPost] = useState<NewPost>({
    title: "",
    content: "",
    is_favorite: false
  });
  const [saving, setSaving] = useState(false);
  const [expandedPost, setExpandedPost] = useState<number | null>(null);

  useEffect(() => {
    loadPosts();
  }, [showFavoritesOnly]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getFacebookPosts(showFavoritesOnly);
      setPosts(response.data || []);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
      toast.error("Fehler beim Laden der Posts");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePost = async () => {
    if (!newPost.content) {
      toast.error("Inhalt ist erforderlich");
      return;
    }
    
    setSaving(true);
    try {
      if (editingPost) {
        await adminAPI.updateFacebookPost(editingPost.id, newPost);
        toast.success("Post aktualisiert");
      } else {
        await adminAPI.createFacebookPost(newPost);
        toast.success("Post erstellt");
      }
      
      setShowAddModal(false);
      setEditingPost(null);
      setNewPost({ title: "", content: "", is_favorite: false });
      loadPosts();
    } catch (error) {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Post wirklich löschen?")) return;
    try {
      await adminAPI.deleteFacebookPost(id);
      toast.success("Post gelöscht");
      loadPosts();
    } catch (error) {
      toast.error("Fehler beim Löschen");
    }
  };

  const handleToggleFavorite = async (post: FacebookPost) => {
    try {
      await adminAPI.updateFacebookPost(post.id, { is_favorite: !post.is_favorite });
      loadPosts();
    } catch (error) {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const handleMarkUsed = async (id: number) => {
    try {
      await adminAPI.markFacebookPostUsed(id);
      toast.success("Als verwendet markiert");
      loadPosts();
    } catch (error) {
      toast.error("Fehler");
    }
  };

  const openEditModal = (post: FacebookPost) => {
    setEditingPost(post);
    setNewPost({
      title: post.title || "",
      content: post.content,
      is_favorite: post.is_favorite
    });
    setShowAddModal(true);
  };

  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("In Zwischenablage kopiert");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit"
    });
  };

  const filteredPosts = posts.filter(p => 
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Zurück-Link */}
      <Link href="/admin/sales" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-4">
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Vertrieb
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-xl">
            <FileText className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facebook Posts</h1>
            <p className="text-sm text-gray-500">{posts.length} Posts</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setEditingPost(null);
            setNewPost({ title: "", content: "", is_favorite: false });
            setShowAddModal(true);
          }}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Plus className="h-5 w-5" />
          <span>Neuer Post</span>
        </button>
      </div>

      {/* Filter & Suche */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
            showFavoritesOnly 
              ? "bg-yellow-100 text-yellow-700 border border-yellow-200" 
              : "bg-gray-100 text-gray-700 border border-gray-200"
          }`}
        >
          <Star className={`h-5 w-5 ${showFavoritesOnly ? "fill-yellow-500" : ""}`} />
          Favoriten
        </button>
      </div>

      {/* Posts Liste */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Keine Posts gefunden</p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="text-purple-600 hover:underline"
          >
            Ersten Post erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div 
              key={post.id}
              className={`card p-4 ${post.is_favorite ? "border-l-4 border-l-yellow-400" : ""}`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  {post.title && (
                    <h3 className="font-semibold text-gray-900">{post.title}</h3>
                  )}
                  {post.is_favorite && (
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleFavorite(post)}
                    className={`p-2 rounded-lg transition-colors ${
                      post.is_favorite 
                        ? "text-yellow-500 hover:bg-yellow-50" 
                        : "text-gray-400 hover:text-yellow-500 hover:bg-yellow-50"
                    }`}
                    title="Favorit"
                  >
                    <Star className={`h-5 w-5 ${post.is_favorite ? "fill-yellow-500" : ""}`} />
                  </button>
                  <button
                    onClick={() => copyContent(post.content)}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Kopieren"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => openEditModal(post)}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Bearbeiten"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Löschen"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div 
                className={`text-gray-700 whitespace-pre-wrap ${
                  expandedPost === post.id ? "" : "line-clamp-4"
                }`}
                onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
              >
                {post.content}
              </div>
              
              {post.content.length > 300 && (
                <button
                  onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                  className="text-sm text-purple-600 mt-2"
                >
                  {expandedPost === post.id ? "Weniger anzeigen" : "Mehr anzeigen"}
                </button>
              )}
              
              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(post.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {post.times_used}x verwendet
                </span>
                <button
                  onClick={() => handleMarkUsed(post.id)}
                  className="text-purple-600 hover:underline ml-auto"
                >
                  Als verwendet markieren
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-xl rounded-t-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingPost ? "Post bearbeiten" : "Neuer Post"}
              </h3>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingPost(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titel (optional)
                </label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="z.B. Sommer-Kampagne"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inhalt *
                </label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[200px]"
                  placeholder="Post-Inhalt eingeben..."
                />
              </div>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPost.is_favorite}
                  onChange={(e) => setNewPost({ ...newPost, is_favorite: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                />
                <span className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Als Favorit markieren
                </span>
              </label>
            </div>
            
            <div className="sticky bottom-0 bg-white border-t p-4 flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingPost(null);
                }}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSavePost}
                disabled={saving}
                className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Check className="h-5 w-5" />
                )}
                {editingPost ? "Speichern" : "Erstellen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
