import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { blogAPI } from '../../lib/api';
import { Helmet } from 'react-helmet-async';
import { 
  BookOpen, Calendar, Eye, Tag, ArrowLeft, Share2, Clock,
  Newspaper, Lightbulb, Briefcase, FileCheck, Home, Trophy, Building2,
  Facebook, Twitter, Linkedin, Copy, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

// Icons für Kategorien
const categoryIcons = {
  news: Newspaper,
  tips: Lightbulb,
  career: Briefcase,
  visa: FileCheck,
  living: Home,
  success_stories: Trophy,
  company: Building2,
};

const categoryColors = {
  news: 'bg-blue-100 text-blue-800 border-blue-200',
  tips: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  career: 'bg-purple-100 text-purple-800 border-purple-200',
  visa: 'bg-green-100 text-green-800 border-green-200',
  living: 'bg-orange-100 text-orange-800 border-orange-200',
  success_stories: 'bg-pink-100 text-pink-800 border-pink-200',
  company: 'bg-gray-100 text-gray-800 border-gray-200',
};

function BlogDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState([]);

  useEffect(() => {
    loadPost();
  }, [slug]);

  const loadPost = async () => {
    setLoading(true);
    try {
      const response = await blogAPI.getPost(slug);
      setPost(response.data);
      
      // Verwandte Posts laden
      const relatedResponse = await blogAPI.getPosts({ 
        category: response.data.category,
        limit: 3 
      });
      setRelatedPosts(relatedResponse.data.filter(p => p.slug !== slug).slice(0, 3));
    } catch (error) {
      toast.error('Artikel nicht gefunden');
      navigate('/blog');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const estimateReadTime = (content) => {
    const wordsPerMinute = 200;
    const words = content?.split(/\s+/).length || 0;
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Link kopiert!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnSocial = (platform) => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(post?.title || '');
    
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    };
    
    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  // Einfacher Markdown zu HTML Converter
  const renderContent = (content) => {
    if (!content) return '';
    
    // Sehr einfache Markdown-Unterstützung
    let html = content
      // Überschriften
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-8 mb-4">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-10 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-12 mb-6">$1</h1>')
      // Fett
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Kursiv
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-600 hover:underline" target="_blank" rel="noopener">$1</a>')
      // Absätze
      .replace(/\n\n/g, '</p><p class="mb-4">')
      // Zeilenumbrüche
      .replace(/\n/g, '<br>');
    
    // Listen separat verarbeiten (um sie in <ul> zu wrappen)
    html = html.replace(/((?:<br>)?- .+(?:<br>- .+)*)/g, (match) => {
      const items = match
        .split('<br>')
        .filter(line => line.trim().startsWith('- '))
        .map(line => `<li>${line.trim().substring(2)}</li>`)
        .join('');
      return `<ul class="list-disc list-inside my-4 space-y-1">${items}</ul>`;
    });
    
    return `<p class="mb-4">${html}</p>`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!post) return null;

  const Icon = categoryIcons[post.category] || BookOpen;

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>{post.meta_title || post.title} | IJP Blog</title>
        <meta name="description" content={post.meta_description || post.excerpt} />
        <meta name="keywords" content={post.meta_keywords || post.tags} />
        
        {/* Open Graph */}
        <meta property="og:title" content={post.meta_title || post.title} />
        <meta property="og:description" content={post.meta_description || post.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={window.location.href} />
        {post.featured_image && <meta property="og:image" content={post.featured_image} />}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.meta_title || post.title} />
        <meta name="twitter:description" content={post.meta_description || post.excerpt} />
        
        {/* Article specific */}
        <meta property="article:published_time" content={post.published_at} />
        <meta property="article:section" content={post.category_label} />
        {post.tags && post.tags.split(',').map((tag, i) => (
          <meta key={i} property="article:tag" content={tag.trim()} />
        ))}
      </Helmet>

      <article className="max-w-4xl mx-auto">
        {/* Zurück-Link */}
        <Link 
          to="/blog" 
          className="inline-flex items-center text-gray-600 hover:text-primary-600 mb-8 group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Zurück zum Blog
        </Link>

        {/* Header */}
        <header className="mb-8">
          {/* Kategorie */}
          <div className="mb-4">
            <Link 
              to={`/blog?category=${post.category}`}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${categoryColors[post.category]} hover:opacity-80 transition-opacity`}
            >
              <Icon className="h-4 w-4" />
              {post.category_label}
            </Link>
          </div>

          {/* Titel */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Meta-Infos */}
          <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-6">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {formatDate(post.published_at)}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {estimateReadTime(post.content)} Min. Lesezeit
            </span>
            <span className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {post.view_count} Aufrufe
            </span>
          </div>

          {/* Tags */}
          {post.tags && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.split(',').map((tag, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  <Tag className="h-3 w-3" />
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}

          {/* Share Buttons */}
          <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl">
            <span className="text-gray-600 font-medium mr-2">Teilen:</span>
            <button
              onClick={() => shareOnSocial('facebook')}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Auf Facebook teilen"
            >
              <Facebook className="h-5 w-5" />
            </button>
            <button
              onClick={() => shareOnSocial('twitter')}
              className="p-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
              title="Auf Twitter teilen"
            >
              <Twitter className="h-5 w-5" />
            </button>
            <button
              onClick={() => shareOnSocial('linkedin')}
              className="p-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
              title="Auf LinkedIn teilen"
            >
              <Linkedin className="h-5 w-5" />
            </button>
            <button
              onClick={copyToClipboard}
              className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              title="Link kopieren"
            >
              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Featured Image */}
        {post.featured_image && (
          <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
            <img 
              src={post.featured_image} 
              alt={post.title}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Excerpt */}
        {post.excerpt && (
          <div className="text-xl text-gray-700 font-medium mb-8 p-6 bg-primary-50 rounded-xl border-l-4 border-primary-600">
            {post.excerpt}
          </div>
        )}

        {/* Content */}
        <div 
          className="prose prose-lg max-w-none text-gray-700 leading-relaxed prose-ul:list-none"
          dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
        />

        {/* CTA Box */}
        <div className="mt-12 p-8 bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl text-white text-center">
          <h3 className="text-2xl font-bold mb-4">Bereit für Ihren Job in Deutschland?</h3>
          <p className="text-primary-100 mb-6">
            Registrieren Sie sich jetzt und entdecken Sie passende Stellenangebote.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link to="/jobs" className="bg-white text-primary-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors">
              Stellenangebote ansehen
            </Link>
            <Link to="/register" className="bg-primary-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-400 transition-colors border-2 border-primary-400">
              Jetzt registrieren
            </Link>
          </div>
        </div>

        {/* Verwandte Artikel */}
        {relatedPosts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Ähnliche Artikel</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => {
                const RelatedIcon = categoryIcons[relatedPost.category] || BookOpen;
                return (
                  <Link
                    key={relatedPost.id}
                    to={`/blog/${relatedPost.slug}`}
                    className="card group hover:shadow-lg transition-all"
                  >
                    <div className="mb-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${categoryColors[relatedPost.category]}`}>
                        <RelatedIcon className="h-3 w-3" />
                        {relatedPost.category_label}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                      {relatedPost.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-2">
                      {formatDate(relatedPost.published_at)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </article>
    </>
  );
}

export default BlogDetail;
