import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { blogAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  BookOpen, Save, ArrowLeft, Eye, Tag, Image, FileText,
  Globe, ChevronDown, Loader2, Star, StarOff, Info
} from 'lucide-react';

function BlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      category: 'news',
      tags: '',
      meta_title: '',
      meta_description: '',
      meta_keywords: '',
      featured_image: '',
      is_published: false,
      is_featured: false,
    }
  });

  const watchTitle = watch('title');
  const watchContent = watch('content');
  const watchIsPublished = watch('is_published');
  const watchIsFeatured = watch('is_featured');

  useEffect(() => {
    loadCategories();
    if (isEdit) {
      loadPost();
    }
  }, [id]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!isEdit && watchTitle) {
      const slug = watchTitle
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setValue('slug', slug);
    }
  }, [watchTitle, isEdit, setValue]);

  const loadCategories = async () => {
    try {
      const response = await blogAPI.getCategories();
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Fehler beim Laden der Kategorien');
    }
  };

  const loadPost = async () => {
    try {
      const response = await blogAPI.adminGetPost(id);
      const post = response.data;
      reset({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || '',
        content: post.content,
        category: post.category,
        tags: post.tags || '',
        meta_title: post.meta_title || '',
        meta_description: post.meta_description || '',
        meta_keywords: post.meta_keywords || '',
        featured_image: post.featured_image || '',
        is_published: post.is_published,
        is_featured: post.is_featured,
      });
    } catch (error) {
      toast.error('Fehler beim Laden des Posts');
      navigate('/admin/blog');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      if (isEdit) {
        await blogAPI.adminUpdatePost(id, data);
        toast.success('Artikel aktualisiert');
      } else {
        await blogAPI.adminCreatePost(data);
        toast.success('Artikel erstellt');
      }
      navigate('/admin/blog');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  // Einfacher Markdown Preview
  const renderPreview = (content) => {
    if (!content) return '<p class="text-gray-400">Keine Vorschau verfügbar</p>';
    
    return content
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-10 mb-5">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-600 underline">$1</a>')
      .replace(/^\- (.*$)/gim, '<li class="ml-4">• $1</li>')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br>');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link 
            to="/admin/blog" 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEdit ? 'Artikel bearbeiten' : 'Neuer Artikel'}
            </h1>
            <p className="text-gray-600">
              {isEdit ? 'Ändern Sie Ihren Blog-Post' : 'Erstellen Sie einen neuen Blog-Post'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              previewMode 
                ? 'bg-primary-100 text-primary-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Eye className="h-5 w-5" />
            Vorschau
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Hauptinhalt */}
          <div className="lg:col-span-2 space-y-6">
            {/* Titel */}
            <div className="card">
              <label className="label">
                Titel <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input-styled"
                placeholder="Ein aussagekräftiger Titel..."
                {...register('title', { required: 'Titel ist erforderlich' })}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            {/* Kurzfassung */}
            <div className="card">
              <label className="label">
                Kurzfassung / Excerpt
              </label>
              <textarea
                className="input-styled"
                rows={3}
                placeholder="Eine kurze Zusammenfassung des Artikels (wird in der Vorschau angezeigt)..."
                {...register('excerpt')}
              />
            </div>

            {/* Content */}
            <div className="card">
              <label className="label">
                Inhalt <span className="text-red-500">*</span>
              </label>
              
              {previewMode ? (
                <div 
                  className="prose prose-lg max-w-none p-4 bg-gray-50 rounded-xl min-h-[400px]"
                  dangerouslySetInnerHTML={{ __html: `<p class="mb-4">${renderPreview(watchContent)}</p>` }}
                />
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-sm text-blue-800">
                    <Info className="h-4 w-4 inline mr-2" />
                    Markdown wird unterstützt: **fett**, *kursiv*, # Überschriften, - Listen, [Link](url)
                  </div>
                  <textarea
                    className="input-styled font-mono"
                    rows={15}
                    placeholder="Schreiben Sie Ihren Artikel hier... (Markdown wird unterstützt)"
                    {...register('content', { required: 'Inhalt ist erforderlich' })}
                  />
                </>
              )}
              {errors.content && (
                <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Veröffentlichung */}
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-500" />
                Veröffentlichung
              </h3>
              
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    {...register('is_published')}
                  />
                  <span className="font-medium text-gray-700">
                    {watchIsPublished ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <Eye className="h-4 w-4" /> Veröffentlicht
                      </span>
                    ) : (
                      'Veröffentlichen'
                    )}
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                    {...register('is_featured')}
                  />
                  <span className="font-medium text-gray-700 flex items-center gap-1">
                    {watchIsFeatured ? (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    ) : (
                      <StarOff className="h-4 w-4 text-gray-400" />
                    )}
                    Featured (Startseite)
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                {isEdit ? 'Speichern' : 'Erstellen'}
              </button>
            </div>

            {/* Kategorie & Tags */}
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5 text-gray-500" />
                Kategorisierung
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="label">Kategorie</label>
                  <div className="relative">
                    <select
                      className="appearance-none w-full px-4 py-2 pr-10 bg-white border-2 border-gray-200 rounded-xl 
                               focus:border-primary-500 focus:outline-none cursor-pointer"
                      {...register('category')}
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="label">Tags</label>
                  <input
                    type="text"
                    className="input-styled"
                    placeholder="visa, arbeit, tipps (kommagetrennt)"
                    {...register('tags')}
                  />
                </div>

                <div>
                  <label className="label">URL-Slug</label>
                  <input
                    type="text"
                    className="input-styled"
                    placeholder="mein-artikel-titel"
                    {...register('slug')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    /blog/{watch('slug') || 'slug'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bild */}
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Image className="h-5 w-5 text-gray-500" />
                Featured Image
              </h3>
              
              <input
                type="text"
                className="input-styled"
                placeholder="https://example.com/bild.jpg"
                {...register('featured_image')}
              />
              <p className="text-xs text-gray-500 mt-1">
                URL zu einem Bild (z.B. von Unsplash)
              </p>
              
              {watch('featured_image') && (
                <div className="mt-4 rounded-lg overflow-hidden">
                  <img 
                    src={watch('featured_image')} 
                    alt="Vorschau"
                    className="w-full h-32 object-cover"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
            </div>

            {/* SEO */}
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5 text-gray-500" />
                SEO-Einstellungen
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="label">Meta-Titel</label>
                  <input
                    type="text"
                    className="input-styled"
                    placeholder="SEO-optimierter Titel (max. 60 Zeichen)"
                    {...register('meta_title')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(watch('meta_title') || watch('title') || '').length}/60 Zeichen
                  </p>
                </div>

                <div>
                  <label className="label">Meta-Beschreibung</label>
                  <textarea
                    className="input-styled"
                    rows={3}
                    placeholder="Kurze Beschreibung für Suchmaschinen (max. 160 Zeichen)"
                    {...register('meta_description')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(watch('meta_description') || watch('excerpt') || '').length}/160 Zeichen
                  </p>
                </div>

                <div>
                  <label className="label">Meta-Keywords</label>
                  <input
                    type="text"
                    className="input-styled"
                    placeholder="keyword1, keyword2, keyword3"
                    {...register('meta_keywords')}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default BlogEditor;
