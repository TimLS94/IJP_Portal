"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  BookOpen, Calendar, Eye, Tag, ArrowLeft, Clock,
  Newspaper, Lightbulb, Briefcase, FileCheck, Home, Trophy, Building2,
  Share2, Copy, Check
} from "lucide-react";
import toast from "react-hot-toast";

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  news: Newspaper,
  tips: Lightbulb,
  career: Briefcase,
  visa: FileCheck,
  living: Home,
  success_stories: Trophy,
  company: Building2,
};

const categoryColors: Record<string, string> = {
  news: "bg-blue-100 text-blue-800 border-blue-200",
  tips: "bg-yellow-100 text-yellow-800 border-yellow-200",
  career: "bg-purple-100 text-purple-800 border-purple-200",
  visa: "bg-green-100 text-green-800 border-green-200",
  living: "bg-orange-100 text-orange-800 border-orange-200",
  success_stories: "bg-pink-100 text-pink-800 border-pink-200",
  company: "bg-gray-100 text-gray-800 border-gray-200",
};

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  category: string;
  category_label: string;
  tags?: string;
  author_name?: string;
  published_at: string;
  view_count: number;
}

interface Props {
  post: BlogPost;
  relatedPosts: BlogPost[];
}

export default function BlogDetailClient({ post, relatedPosts }: Props) {
  const [copied, setCopied] = useState(false);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const estimateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content?.split(/\s+/).length || 0;
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link kopiert!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnSocial = (platform: string) => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(post?.title || "");
    
    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    };
    
    window.open(urls[platform], "_blank", "width=600,height=400");
  };

  const renderContent = (content: string) => {
    if (!content) return "";
    
    let html = content
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-8 mb-4">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-10 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-12 mb-6">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-600 hover:underline" target="_blank" rel="noopener">$1</a>')
      .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, "<br>");
    
    return `<p class="mb-4">${html}</p>`;
  };

  const Icon = categoryIcons[post.category] || BookOpen;

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      {/* Zurück-Link */}
      <Link 
        href="/blog" 
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
            href={`/blog?category=${post.category}`}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${categoryColors[post.category] || "bg-gray-100 text-gray-800 border-gray-200"} hover:opacity-80 transition-opacity`}
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
            {post.tags.split(",").map((tag, index) => (
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
            onClick={() => shareOnSocial("facebook")}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title="Auf Facebook teilen"
          >
            <Share2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => shareOnSocial("twitter")}
            className="p-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
            title="Auf Twitter teilen"
          >
            <Share2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => shareOnSocial("linkedin")}
            className="p-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
            title="Auf LinkedIn teilen"
          >
            <Share2 className="h-5 w-5" />
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
      <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
        {post.featured_image ? (
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-auto"
          />
        ) : (
          <div className="h-56 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
            <img src="/logo.png" alt="JobOn" className="h-20 w-auto opacity-40" />
          </div>
        )}
      </div>

      {/* Excerpt */}
      {post.excerpt && (
        <div className="text-xl text-gray-700 font-medium mb-8 p-6 bg-primary-50 rounded-xl border-l-4 border-primary-600">
          {post.excerpt}
        </div>
      )}

      {/* Content */}
      <div 
        className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
      />

      {/* CTA Box */}
      <div className="mt-12 p-8 bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl text-white text-center">
        <h3 className="text-2xl font-bold mb-4">Bereit für Ihren Job in Deutschland?</h3>
        <p className="text-primary-100 mb-6">
          Registrieren Sie sich jetzt und entdecken Sie passende Stellenangebote.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link href="/jobs" className="bg-white text-primary-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors">
            Stellenangebote ansehen
          </Link>
          <Link href="/register" className="bg-primary-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-400 transition-colors border-2 border-primary-400">
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
                  href={`/blog/${relatedPost.slug}`}
                  className="card group hover:shadow-lg transition-all"
                >
                  <div className="mb-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${categoryColors[relatedPost.category] || "bg-gray-100 text-gray-800 border-gray-200"}`}>
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
  );
}
