"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  BookOpen, Calendar, Eye, Search, ChevronDown, ArrowRight,
  Newspaper, Lightbulb, Briefcase, FileCheck, Home, Trophy, Building2
} from "lucide-react";
import { blogAPI } from "@/lib/api";

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

interface Category {
  value: string;
  label: string;
}

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  category_label: string;
  language?: string;
  featured_image?: string;
  published_at: string;
  view_count: number;
}

function getPostUrl(post: BlogPost): string {
  if (post.language === "es") return `/blog/es/${post.slug}`;
  if (post.language === "en") return `/blog/en/${post.slug}`;
  if (post.language === "ru") return `/blog/ru/${post.slug}`;
  return `/blog/${post.slug}`;
}

function toBlogLanguage(uiLang: string): string {
  return ["de", "en", "es", "ru"].includes(uiLang) ? uiLang : "de";
}

const UI_TEXT: Record<string, Record<string, string>> = {
  de: {
    title: "Blog & Ratgeber",
    subtitle: "Tipps, News und hilfreiche Informationen rund um Arbeit in Deutschland",
    searchPlaceholder: "Artikel durchsuchen...",
    allCategories: "Alle Kategorien",
    searchBtn: "Suchen",
    all: "Alle",
    noPosts: "Keine Artikel gefunden",
    noPostsHint: "Versuchen Sie andere Suchbegriffe oder Kategorien",
    views: "Aufrufe",
    readMore: "Weiterlesen",
  },
  en: {
    title: "Blog & Guide",
    subtitle: "Tips, news and helpful information about working in Germany",
    searchPlaceholder: "Search articles...",
    allCategories: "All categories",
    searchBtn: "Search",
    all: "All",
    noPosts: "No articles found",
    noPostsHint: "Try different search terms or categories",
    views: "views",
    readMore: "Read more",
  },
  es: {
    title: "Blog y Guía",
    subtitle: "Consejos, noticias e información útil sobre trabajar en Alemania",
    searchPlaceholder: "Buscar artículos...",
    allCategories: "Todas las categorías",
    searchBtn: "Buscar",
    all: "Todos",
    noPosts: "No se encontraron artículos",
    noPostsHint: "Pruebe otros términos de búsqueda o categorías",
    views: "vistas",
    readMore: "Leer más",
  },
  ru: {
    title: "Блог и советы",
    subtitle: "Советы, новости и полезная информация о работе в Германии",
    searchPlaceholder: "Поиск статей...",
    allCategories: "Все категории",
    searchBtn: "Поиск",
    all: "Все",
    noPosts: "Статьи не найдены",
    noPostsHint: "Попробуйте другие поисковые запросы или категории",
    views: "просмотров",
    readMore: "Читать далее",
  },
};

const DATE_LOCALES: Record<string, string> = { de: "de-DE", en: "en-GB", es: "es-ES", ru: "ru-RU" };

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  de: {
    news: "Neuigkeiten", tips: "Tipps & Tricks", career: "Karriere-Ratgeber",
    visa: "Visa & Arbeitserlaubnis", living: "Leben in Deutschland",
    success_stories: "Erfolgsgeschichten", company: "Für Unternehmen",
  },
  en: {
    news: "News", tips: "Tips & Tricks", career: "Career Guide",
    visa: "Visa & Work Permit", living: "Living in Germany",
    success_stories: "Success Stories", company: "For Companies",
  },
  es: {
    news: "Noticias", tips: "Consejos y trucos", career: "Guía profesional",
    visa: "Visa y permiso de trabajo", living: "Vivir en Alemania",
    success_stories: "Casos de éxito", company: "Para empresas",
  },
  ru: {
    news: "Новости", tips: "Советы и хитрости", career: "Карьерный гид",
    visa: "Виза и разрешение на работу", living: "Жизнь в Германии",
    success_stories: "Истории успеха", company: "Для компаний",
  },
};

interface Props {
  initialPosts: BlogPost[];
  categories: Category[];
}

export default function BlogListClient({ initialPosts, categories }: Props) {
  const searchParams = useSearchParams();
  const { i18n } = useTranslation();

  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");

  const blogLang = toBlogLanguage(i18n.language);
  const tx = UI_TEXT[blogLang] ?? UI_TEXT.de;
  const catLabel = (value: string, fallback: string) =>
    CATEGORY_LABELS[blogLang]?.[value] ?? fallback;

  const loadPosts = useCallback(async (category?: string, searchTerm?: string, lang?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      if (searchTerm) params.search = searchTerm;
      params.language = lang || blogLang;

      const response = await blogAPI.getPosts(params);
      setPosts(response.data || []);
    } catch {
      console.error("Fehler beim Laden der Blog-Posts");
    } finally {
      setLoading(false);
    }
  }, [blogLang]);

  useEffect(() => {
    loadPosts(selectedCategory, search, blogLang);
  }, [blogLang]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadPosts(selectedCategory, search, blogLang);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    loadPosts(category, search, blogLang);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString(DATE_LOCALES[blogLang] ?? "de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-4">
          <BookOpen className="h-8 w-8 text-primary-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{tx.title}</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          {tx.subtitle}
        </p>
      </div>

      {/* Filter & Suche */}
      <div className="card mb-8">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          {/* Suchfeld */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl 
                       focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none"
              placeholder={tx.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {/* Kategorie Filter */}
          <div className="relative min-w-[200px]">
            <select
              className="appearance-none w-full px-4 py-3 pr-10 bg-white border-2 border-gray-200 rounded-xl 
                       focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none
                       cursor-pointer text-gray-700 font-medium"
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <option value="">{tx.allCategories}</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>{catLabel(cat.value, cat.label)}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
          
          <button type="submit" className="btn-primary">
            {tx.searchBtn}
          </button>
        </form>
      </div>

      {/* Kategorien als Chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => handleCategoryChange("")}
          className={`px-4 py-2 rounded-full font-medium transition-all ${
            !selectedCategory 
              ? "bg-primary-600 text-white" 
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {tx.all}
        </button>
        {categories.map((cat) => {
          const Icon = categoryIcons[cat.value] || BookOpen;
          return (
            <button
              key={cat.value}
              onClick={() => handleCategoryChange(cat.value)}
              className={`px-4 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${
                selectedCategory === cat.value 
                  ? "bg-primary-600 text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              {catLabel(cat.value, cat.label)}
            </button>
          );
        })}
      </div>

      {/* Blog Posts */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">{tx.noPosts}</p>
          <p className="text-gray-400">{tx.noPostsHint}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => {
            const Icon = categoryIcons[post.category] || BookOpen;
            return (
              <Link
                key={post.id}
                href={getPostUrl(post)}
                className="card group hover:shadow-xl transition-all overflow-hidden"
              >
                {/* Bild */}
                {post.featured_image ? (
                  <div className="h-48 -mx-6 -mt-6 mb-4 overflow-hidden">
                    <img 
                      src={post.featured_image} 
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="h-48 -mx-6 -mt-6 mb-4 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
                    <img src="/logo.png" alt="JobOn" className="h-16 w-auto opacity-40" />
                  </div>
                )}
                
                {/* Kategorie Badge */}
                <div className="mb-3">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${categoryColors[post.category] || "bg-gray-100 text-gray-800 border-gray-200"}`}>
                    <Icon className="h-3 w-3" />
                    {catLabel(post.category, post.category_label)}
                  </span>
                </div>
                
                {/* Titel */}
                <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                  {post.title}
                </h2>
                
                {/* Excerpt */}
                {post.excerpt && (
                  <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
                )}
                
                {/* Meta */}
                <div className="flex items-center justify-between text-sm text-gray-500 mt-auto pt-4 border-t">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(post.published_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {post.view_count} {tx.views}
                  </span>
                </div>
                
                {/* Lesen Link */}
                <div className="mt-4 flex items-center text-primary-600 font-medium group-hover:gap-2 transition-all">
                  {tx.readMore}
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
