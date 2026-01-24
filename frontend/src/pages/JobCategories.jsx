import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  GraduationCap, Leaf, Plane, Briefcase, BookOpen,
  Clock, FileText, Globe, Users, CheckCircle, ArrowRight,
  Calendar, MapPin, Euro, Info
} from 'lucide-react';

function CategoryCard({ category, isExpanded, onToggle, t }) {
  const Icon = category.icon;
  
  // Get translations
  const catKey = `jobCategories.${category.id}`;
  const title = t(`${catKey}.title`);
  const subtitle = t(`${catKey}.subtitle`);
  const shortDesc = t(`${catKey}.shortDesc`);
  const description = t(`${catKey}.description`);
  const durationText = t(`${catKey}.durationText`);
  const salaryText = t(`${catKey}.salaryText`);
  const legalBasisText = t(`${catKey}.legalBasisText`);
  const sectors = t(`${catKey}.sectors`);
  
  // Array items
  const forWhom = [
    t(`${catKey}.forWhom1`),
    t(`${catKey}.forWhom2`),
    t(`${catKey}.forWhom3`),
  ].filter(item => !item.startsWith(catKey));
  
  const docs = [
    t(`${catKey}.docs1`),
    t(`${catKey}.docs2`),
    t(`${catKey}.docs3`),
    t(`${catKey}.docs4`),
  ].filter(item => !item.startsWith(catKey));
  
  const process = [
    t(`${catKey}.process1`),
    t(`${catKey}.process2`),
    t(`${catKey}.process3`),
    t(`${catKey}.process4`),
    t(`${catKey}.process5`),
  ].filter(item => !item.startsWith(catKey));
  
  return (
    <div 
      className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 ${
        isExpanded ? 'ring-2 ring-primary-500' : 'hover:shadow-xl'
      }`}
    >
      {/* Header */}
      <div 
        className={`bg-gradient-to-r ${category.gradient} p-6 text-white cursor-pointer`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl">
            <span className="text-3xl">{category.emoji}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold">{title}</h3>
            <p className="text-white/80">{subtitle}</p>
          </div>
          <ArrowRight className={`h-6 w-6 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
        <p className="mt-4 text-white/90">{shortDesc}</p>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <p className="text-gray-700 leading-relaxed">{description}</p>
          </div>

          {/* Grid Info */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Für wen */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-primary-600" />
                {t('jobCategories.forWhom')}
              </h4>
              <ul className="space-y-2">
                {forWhom.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Dokumente */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-primary-600" />
                {t('jobCategories.requiredDocs')}
              </h4>
              <ul className="space-y-2">
                {docs.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700">
                    <CheckCircle className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-gray-600">{t('jobCategories.duration')}</p>
              <p className="font-bold text-gray-900 text-sm">{durationText}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <Euro className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-xs text-gray-600">{t('jobCategories.salary')}</p>
              <p className="font-bold text-gray-900 text-sm">{salaryText}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <Globe className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <p className="text-xs text-gray-600">{t('jobCategories.legalBasis')}</p>
              <p className="font-bold text-gray-900 text-xs">{legalBasisText}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <MapPin className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <p className="text-xs text-gray-600">{t('jobCategories.sectors')}</p>
              <p className="font-bold text-gray-900 text-xs truncate">{sectors}</p>
            </div>
          </div>

          {/* Process */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
            <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Info className="h-5 w-5 text-primary-600" />
              {t('jobCategories.howItWorks')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {process.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full bg-gradient-to-r ${category.gradient} text-white text-xs flex items-center justify-center font-bold`}>
                    {i + 1}
                  </span>
                  <span className="text-gray-700 text-sm">{step}</span>
                  {i < process.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-gray-400 hidden md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              to={`/jobs?type=${category.id}`}
              className={`bg-gradient-to-r ${category.gradient} text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2`}
            >
              {t('jobCategories.findJobs')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/register"
              className="border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-bold hover:border-primary-500 hover:text-primary-600 transition-all"
            >
              {t('jobCategories.registerNow')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JobCategories() {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState('studentenferienjob');

  // Category metadata (icons, colors, emojis)
  const categories = [
    {
      id: 'studentenferienjob',
      icon: GraduationCap,
      emoji: '🎓',
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      id: 'saisonjob',
      icon: Leaf,
      emoji: '🌾',
      color: 'orange',
      gradient: 'from-orange-500 to-orange-600',
    },
    {
      id: 'workandholiday',
      icon: Plane,
      emoji: '✈️',
      color: 'teal',
      gradient: 'from-teal-500 to-teal-600',
    },
    {
      id: 'fachkraft',
      icon: Briefcase,
      emoji: '👔',
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
    },
    {
      id: 'ausbildung',
      icon: BookOpen,
      emoji: '📚',
      color: 'green',
      gradient: 'from-green-500 to-green-600',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {t('jobCategories.title')}
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          {t('jobCategories.subtitle')}
        </p>
      </div>

      {/* Quick Navigation */}
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setExpandedId(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              expandedId === cat.id
                ? `bg-gradient-to-r ${cat.gradient} text-white shadow-lg`
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.emoji} {t(`jobCategories.${cat.id}.title`)}
          </button>
        ))}
      </div>

      {/* Categories */}
      <div className="space-y-6">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            isExpanded={expandedId === category.id}
            onToggle={() => setExpandedId(expandedId === category.id ? null : category.id)}
            t={t}
          />
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="mt-12 bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-center text-white">
        <h2 className="text-2xl font-bold mb-4">{t('jobCategories.unsure')}</h2>
        <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
          {t('jobCategories.unsureDesc')}
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link 
            to="/contact" 
            className="bg-white text-primary-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all"
          >
            {t('jobCategories.contactUs')}
          </Link>
          <Link 
            to="/faq" 
            className="border-2 border-white text-white px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition-all"
          >
            {t('jobCategories.faqLink')}
          </Link>
        </div>
      </div>
    </div>
  );
}
