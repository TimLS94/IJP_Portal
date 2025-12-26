import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { blogAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  BookOpen, Save, ArrowLeft, Eye, EyeOff, Tag, Image, FileText,
  Globe, ChevronDown, Loader2, Star, StarOff, Info, Upload, Link as LinkIcon
} from 'lucide-react';

function BlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageMode, setImageMode] = useState('url'); // 'url' oder 'upload'
  const fileInputRef = useRef(null);
  
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

  // Bild-Upload Handler
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validierung
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Nur JPG, PNG, GIF und WebP erlaubt');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Maximale Dateigröße: 5 MB');
      return;
    }
    
    setUploading(true);
    try {
      const response = await blogAPI.uploadImage(file);
      if (response.data.success) {
        // Data-URL direkt verwenden (Base64)
        setValue('featured_image', response.data.url);
        toast.success('Bild hochgeladen!');
      }
    } catch (error) {
      console.error('Upload-Fehler:', error);
      toast.error(error.response?.data?.detail || 'Fehler beim Hochladen');
    } finally {
      setUploading(false);
      // Input zurücksetzen
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
              
              {/* Aktueller Status Badge */}
              <div className={`mb-4 p-3 rounded-lg text-center font-semibold ${
                watchIsPublished 
                  ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                  : 'bg-gray-100 text-gray-600 border-2 border-gray-300'
              }`}>
                {watchIsPublished ? (
                  <span className="flex items-center justify-center gap-2">
                    <Eye className="h-5 w-5" />
                    🟢 LIVE - Öffentlich sichtbar
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <EyeOff className="h-5 w-5" />
                    ⚪ ENTWURF - Nicht sichtbar
                  </span>
                )}
              </div>
              
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    {...register('is_published')}
                  />
                  <span className="font-medium text-gray-700">
                    Artikel veröffentlichen
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
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
              
              {/* Bild-Vorschau */}
              <div className="mb-4 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50">
                {watch('featured_image') ? (
                  <div className="relative group">
                    <img 
                      src={watch('featured_image')} 
                      alt="Vorschau"
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '';
                        e.target.parentElement.innerHTML = `
                          <div class="h-48 flex flex-col items-center justify-center text-red-500 bg-red-50">
                            <svg class="h-12 w-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                            </svg>
                            <p class="font-medium">Bild konnte nicht geladen werden</p>
                            <p class="text-sm">Prüfen Sie die URL</p>
                          </div>
                        `;
                      }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setValue('featured_image', '')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                      >
                        Bild entfernen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center text-gray-400">
                    <Image className="h-12 w-12 mb-2" />
                    <p className="font-medium">Kein Bild ausgewählt</p>
                    <p className="text-sm">Laden Sie ein Bild hoch oder fügen Sie eine URL ein</p>
                  </div>
                )}
              </div>
              
              {/* Tabs: Upload / URL */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                    imageMode === 'upload'
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  Hochladen
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                    imageMode === 'url'
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                  }`}
                >
                  <LinkIcon className="h-4 w-4" />
                  URL
                </button>
              </div>
              
              {/* Upload-Modus */}
              {imageMode === 'upload' && (
                <div className="space-y-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Wird hochgeladen...
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        Bild auswählen
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 text-center">
                    JPG, PNG, GIF oder WebP • Max. 5 MB
                  </p>
                </div>
              )}
              
              {/* URL-Modus */}
              {imageMode === 'url' && (
                <>
                  <div className="relative">
                    <input
                      type="text"
                      className="input-styled pr-10"
                      placeholder="https://images.unsplash.com/photo-..."
                      {...register('featured_image')}
                    />
                    {watch('featured_image') && (
                      <button
                        type="button"
                        onClick={() => setValue('featured_image', '')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  
                  {/* Tipps */}
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                    <p className="font-medium mb-1">💡 Tipp: Kostenlose Bilder</p>
                    <a 
                      href="https://unsplash.com/s/photos/business-work" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      → Unsplash.com durchsuchen
                    </a>
                  </div>
                  
                  {/* Schnellauswahl */}
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">Schnellauswahl:</p>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: '💼 Business', url: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800' },
                        { label: '🎓 Bildung', url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800' },
                        { label: '🏭 Industrie', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800' },
                        { label: '✈️ Reise', url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800' },
                      ].map((img) => (
                        <button
                          key={img.label}
                          type="button"
                          onClick={() => setValue('featured_image', img.url)}
                          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                        >
                          {img.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
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
