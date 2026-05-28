import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { blogAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  BookOpen, Plus, Edit, Trash2, Eye, EyeOff, Calendar, 
  Star, StarOff, Search, ChevronDown, Loader2, ExternalLink
} from 'lucide-react';

function BlogManager() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ is_published: '', category: '' });

  useEffect(() => {
    loadCategories();
    loadPosts();
  }, [filter]);

  const loadCategories = async () => {
    try {
      const response = await blogAPI.getCategories();
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Fehler beim Laden der Kategorien');
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.is_published !== '') params.is_published = filter.is_published === 'true';
      if (filter.category) params.category = filter.category;
      
      const response = await blogAPI.adminGetPosts(params);
      setPosts(response.data);
    } catch (error) {
      toast.error('Fehler beim Laden der Blog-Posts');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (id) => {
    try {
      const response = await blogAPI.adminTogglePublish(id);
      toast.success(response.data.message);
      loadPosts();
    } catch (error) {
      toast.error('Fehler beim Ändern des Status');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Möchten Sie diesen Blog-Post wirklich löschen?')) return;
    
    try {
      await blogAPI.adminDeletePost(id);
      toast.success('Blog-Post gelöscht');
      loadPosts();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Blog verwalten</h1>
            <p className="text-gray-600">Erstellen und bearbeiten Sie Blog-Artikel</p>
          </div>
        </div>
        <Link to="/admin/blog/new" className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Neuer Artikel
        </Link>
      </div>

      {/* Filter */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[180px]">
            <label className="label">Status</label>
            <div className="relative">
              <select
                className="appearance-none w-full px-4 py-2 pr-10 bg-white border-2 border-gray-200 rounded-xl 
                         focus:border-primary-500 focus:outline-none cursor-pointer"
                value={filter.is_published}
                onChange={(e) => setFilter({ ...filter, is_published: e.target.value })}
              >
                <option value="">Alle</option>
                <option value="true">Veröffentlicht</option>
                <option value="false">Entwurf</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          <div className="min-w-[200px]">
            <label className="label">Kategorie</label>
            <div className="relative">
              <select
                className="appearance-none w-full px-4 py-2 pr-10 bg-white border-2 border-gray-200 rounded-xl 
                         focus:border-primary-500 focus:outline-none cursor-pointer"
                value={filter.category}
                onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              >
                <option value="">Alle Kategorien</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Posts Liste */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="card text-center py-12">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-4">Noch keine Blog-Posts vorhanden</p>
          <Link to="/admin/blog/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Ersten Artikel erstellen
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Titel</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Kategorie</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Datum</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Aufrufe</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {post.is_featured && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 line-clamp-1">{post.title}</p>
                        <p className="text-sm text-gray-500">/{post.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                      {post.category_label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {post.is_published ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                        <Eye className="h-3 w-3" />
                        Veröffentlicht
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                        <EyeOff className="h-3 w-3" />
                        Entwurf
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    {formatDate(post.published_at || post.created_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {post.view_count}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {post.is_published && (
                        <a
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
                          title="Ansehen"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleTogglePublish(post.id)}
                        className={`p-2 rounded-lg ${
                          post.is_published 
                            ? 'text-gray-500 hover:text-orange-600 hover:bg-orange-50' 
                            : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={post.is_published ? 'Verstecken' : 'Veröffentlichen'}
                      >
                        {post.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <Link
                        to={`/admin/blog/edit/${post.id}`}
                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                        title="Bearbeiten"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default BlogManager;
