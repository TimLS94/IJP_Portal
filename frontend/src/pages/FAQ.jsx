import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  HelpCircle, ChevronDown, ChevronUp, Building2, Users, 
  Shield, Mail, CheckCircle
} from 'lucide-react';

// Einfacher Markdown-Parser für **fett** und Listen
function formatAnswer(text) {
  if (!text) return '';
  // **text** zu <strong>text</strong>
  let formatted = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Listen-Items mit • am Anfang
  formatted = formatted.replace(/^• /gm, '<li class="ml-4">');
  return formatted;
}

function FAQItem({ question, answer, isOpen, onClick }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onClick}
        className="w-full px-6 py-4 flex items-center justify-between text-left bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900 pr-4">{question}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-primary-600 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div 
            className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: formatAnswer(answer) }}
          />
        </div>
      )}
    </div>
  );
}

function FAQ() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('employer');
  const [openQuestions, setOpenQuestions] = useState({});

  // Kategorien mit Übersetzungskeys
  const faqCategories = [
    {
      id: 'employer',
      title: t('faq.forEmployers'),
      icon: Building2,
      color: 'bg-blue-100 text-blue-600',
      questions: [
        { question: t('faq.employer.q1'), answer: t('faq.employer.a1') },
        { question: t('faq.employer.q2'), answer: t('faq.employer.a2') },
        { question: t('faq.employer.q3'), answer: t('faq.employer.a3') },
        { question: t('faq.employer.q4'), answer: t('faq.employer.a4') },
        { question: t('faq.employer.q5'), answer: t('faq.employer.a5') },
        { question: t('faq.employer.q6'), answer: t('faq.employer.a6') },
      ]
    },
    {
      id: 'applicant',
      title: t('faq.forApplicants'),
      icon: Users,
      color: 'bg-green-100 text-green-600',
      questions: [
        { question: t('faq.applicant.q1'), answer: t('faq.applicant.a1') },
        { question: t('faq.applicant.q2'), answer: t('faq.applicant.a2') },
        { question: t('faq.applicant.q3'), answer: t('faq.applicant.a3') },
        { question: t('faq.applicant.q4'), answer: t('faq.applicant.a4') },
        { question: t('faq.applicant.q5'), answer: t('faq.applicant.a5') },
      ]
    },
    {
      id: 'legal',
      title: t('faq.legalVisa'),
      icon: Shield,
      color: 'bg-purple-100 text-purple-600',
      questions: [
        { question: t('faq.legal.q1'), answer: t('faq.legal.a1') },
        { question: t('faq.legal.q2'), answer: t('faq.legal.a2') },
        { question: t('faq.legal.q3'), answer: t('faq.legal.a3') },
        { question: t('faq.legal.q4'), answer: t('faq.legal.a4') },
      ]
    },
    {
      id: 'technical',
      title: t('faq.technicalLabel'),
      icon: HelpCircle,
      color: 'bg-orange-100 text-orange-600',
      questions: [
        { question: t('faq.technical.q1'), answer: t('faq.technical.a1') },
        { question: t('faq.technical.q2'), answer: t('faq.technical.a2') },
        { question: t('faq.technical.q3'), answer: t('faq.technical.a3') },
        { question: t('faq.technical.q4'), answer: t('faq.technical.a4') },
      ]
    },
  ];

  const toggleQuestion = (categoryId, questionIndex) => {
    const key = `${categoryId}-${questionIndex}`;
    setOpenQuestions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const currentCategory = faqCategories.find(c => c.id === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <HelpCircle className="h-8 w-8 text-primary-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {t('faq.title')}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('faq.subtitle')}
            </p>
          </div>

          {/* Kategorie-Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {faqCategories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                    activeCategory === category.id
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {category.title}
                </button>
              );
            })}
          </div>

          {/* FAQ Liste */}
          {currentCategory && (
            <div className="space-y-3">
              <div className={`flex items-center gap-3 mb-6 p-4 rounded-xl ${currentCategory.color}`}>
                <currentCategory.icon className="h-6 w-6" />
                <h2 className="text-xl font-semibold">{currentCategory.title}</h2>
              </div>
              
              {currentCategory.questions.map((faq, index) => (
                <FAQItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openQuestions[`${currentCategory.id}-${index}`]}
                  onClick={() => toggleQuestion(currentCategory.id, index)}
                />
              ))}
            </div>
          )}

          {/* Kontakt CTA */}
          <div className="mt-12 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-2">{t('faq.moreQuestions')}</h2>
            <p className="text-primary-100 mb-6">
              {t('faq.moreQuestionsDesc')}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-colors"
              >
                <Mail className="h-5 w-5" />
                {t('faq.contactUs')}
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-400 transition-colors"
              >
                <CheckCircle className="h-5 w-5" />
                {t('faq.registerNow')}
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default FAQ;
