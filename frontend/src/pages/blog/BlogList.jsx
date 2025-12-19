import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { blogAPI } from '../../lib/api';
import { 
  BookOpen, Calendar, Eye, Tag, Search, ChevronDown, ArrowRight,
  Newspaper, Lightbulb, Briefcase, FileCheck, Home, Trophy, Building2
} from 'lucide-react';

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

function BlogList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadPosts();
  }, [selectedCategory]);

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
      if (selectedCategory) params.category = selectedCategory;
      if (search) params.search = search;
      
      const response = await blogAPI.getPosts(params);
      setPosts(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Blog-Posts');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadPosts();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-4">
          <BookOpen className="h-8 w-8 text-primary-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Blog & Ratgeber</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Tipps, News und hilfreiche Informationen rund um Arbeit in Deutschland
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
              placeholder="Artikel durchsuchen..."
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
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Alle Kategorien</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
          
          <button type="submit" className="btn-primary">
            Suchen
          </button>
        </form>
      </div>

      {/* Kategorien als Chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-4 py-2 rounded-full font-medium transition-all ${
            !selectedCategory 
              ? 'bg-primary-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Alle
        </button>
        {categories.map((cat) => {
          const Icon = categoryIcons[cat.value] || BookOpen;
          return (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${
                selectedCategory === cat.value 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {cat.label}
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
          <p className="text-gray-500 text-lg mb-2">Keine Artikel gefunden</p>
          <p className="text-gray-400">Versuchen Sie andere Suchbegriffe oder Kategorien</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => {
            const Icon = categoryIcons[post.category] || BookOpen;
            return (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
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
                  <div className="h-48 -mx-6 -mt-6 mb-4 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                    <Icon className="h-16 w-16 text-primary-400" />
                  </div>
                )}
                
                {/* Kategorie Badge */}
                <div className="mb-3">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${categoryColors[post.category]}`}>
                    <Icon className="h-3 w-3" />
                    {post.category_label}
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
                    {post.view_count} Aufrufe
                  </span>
                </div>
                
                {/* Lesen Link */}
                <div className="mt-4 flex items-center text-primary-600 font-medium group-hover:gap-2 transition-all">
                  Weiterlesen
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

export default BlogList;
