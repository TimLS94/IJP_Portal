import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Briefcase, Users, Building2, FileCheck, ArrowRight, BookOpen, Calendar, Eye } from 'lucide-react';
import { blogAPI } from '../lib/api';

function Home() {
  const { t } = useTranslation();
  const [featuredPosts, setFeaturedPosts] = useState([]);

  const features = [
    {
      icon: <Briefcase className="h-8 w-8 text-primary-600" />,
      title: t('home.feature1Title'),
      description: t('home.feature1Desc')
    },
    {
      icon: <Users className="h-8 w-8 text-primary-600" />,
      title: t('home.feature2Title'),
      description: t('home.feature2Desc')
    },
    {
      icon: <Building2 className="h-8 w-8 text-primary-600" />,
      title: t('home.feature3Title'),
      description: t('home.feature3Desc')
    },
    {
      icon: <FileCheck className="h-8 w-8 text-primary-600" />,
      title: t('home.feature4Title'),
      description: t('home.feature4Desc')
    }
  ];

  const positionTypes = [
    { id: 'studentenferienjob', name: t('positionTypes.studentenferienjob'), color: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200' },
    { id: 'saisonjob', name: t('positionTypes.saisonjob'), color: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200' },
    { id: 'fachkraft', name: t('positionTypes.fachkraft'), color: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200' },
    { id: 'ausbildung', name: t('positionTypes.ausbildung'), color: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' }
  ];

  useEffect(() => {
    loadFeaturedPosts();
  }, []);

  const loadFeaturedPosts = async () => {
    try {
      const response = await blogAPI.getFeaturedPosts(3);
      setFeaturedPosts(response.data);
    } catch (error) {
      // Blog posts sind optional, kein Fehler anzeigen
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-primary-900 text-white rounded-3xl p-8 md:p-16 mb-16 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
          {/* Logo */}
          <div className="flex-shrink-0">
            <div className="bg-white rounded-2xl p-6 shadow-2xl">
              <img 
                src="/logo.png" 
                alt="IJP - International Job Placement" 
                className="h-32 w-auto"
              />
            </div>
          </div>
          
          {/* Text Content */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              {t('home.title')}
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl">
              {t('home.subtitle')}
            </p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <Link 
                to="/jobs" 
                className="bg-white text-gray-900 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                {t('home.browseJobs')}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link 
                to="/register" 
                className="bg-primary-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-primary-500 transition-all border-2 border-primary-500"
              >
                {t('home.registerNow')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Position Types */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">{t('home.jobTypes')}</h2>
        <p className="text-gray-600 text-center mb-8">Wählen Sie Ihre gewünschte Stellenart</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {positionTypes.map((type) => (
            <Link
              key={type.id}
              to={`/jobs?type=${type.id}`}
              className={`${type.color} p-6 rounded-xl text-center border-2 transition-all hover:shadow-lg hover:scale-105`}
            >
              <span className="font-bold text-lg">{type.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">{t('home.features')}</h2>
        <p className="text-gray-600 text-center mb-8">Ihre Vorteile auf einen Blick</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="card text-center hover:shadow-xl transition-shadow group">
              <div className="flex justify-center mb-4 group-hover:scale-110 transition-transform">
                <div className="p-4 bg-primary-100 rounded-xl">
                  {feature.icon}
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-primary-50 rounded-2xl p-6 text-center">
            <p className="text-4xl font-bold text-primary-600">1000+</p>
            <p className="text-gray-600 font-medium">Vermittelte Stellen</p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-6 text-center">
            <p className="text-4xl font-bold text-blue-600">30+</p>
            <p className="text-gray-600 font-medium">Partnerunternehmen</p>
          </div>
          <div className="bg-green-50 rounded-2xl p-6 text-center">
            <p className="text-4xl font-bold text-green-600">10+</p>
            <p className="text-gray-600 font-medium">Länder</p>
          </div>
          <div className="bg-purple-50 rounded-2xl p-6 text-center">
            <p className="text-4xl font-bold text-purple-600">98%</p>
            <p className="text-gray-600 font-medium">Zufriedenheit</p>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      {featuredPosts.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Blog & Ratgeber</h2>
              <p className="text-gray-600">Tipps und News für Ihren Karriereweg</p>
            </div>
            <Link to="/blog" className="btn-outline flex items-center gap-2">
              Alle Artikel <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {featuredPosts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="card group hover:shadow-xl transition-all overflow-hidden"
              >
                {post.featured_image ? (
                  <div className="h-40 -mx-6 -mt-6 mb-4 overflow-hidden">
                    <img 
                      src={post.featured_image} 
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="h-40 -mx-6 -mt-6 mb-4 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-primary-400" />
                  </div>
                )}
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full mb-3">
                  {post.category_label}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{post.excerpt}</p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-3 border-t">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(post.published_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {post.view_count}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-3xl p-12 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">{t('home.ctaTitle')}</h2>
        <p className="text-primary-100 mb-8 max-w-2xl mx-auto text-lg">
          {t('home.ctaText')}
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link to="/register" className="bg-white text-primary-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg">
            {t('home.registerApplicant')}
          </Link>
          <Link to="/register" className="bg-primary-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-primary-400 transition-all border-2 border-primary-400">
            {t('home.registerCompany')}
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Home;
