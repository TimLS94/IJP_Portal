import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Users, Briefcase, Award, CheckCircle, ArrowRight,
  Building2, GraduationCap, UserCheck, Target, Heart
} from 'lucide-react';

function About() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {t('about.title')}
            </h1>
            <p className="text-xl text-primary-100">
              {t('about.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">{t('about.mission.title')}</h2>
                <p className="text-gray-600 mb-4">
                  {t('about.mission.text1')}
                </p>
                <p className="text-gray-600">
                  {t('about.mission.text2')}
                </p>
              </div>
              <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl p-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Target className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{t('about.values.targeted')}</h3>
                      <p className="text-sm text-gray-600">{t('about.values.targetedDesc')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <UserCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{t('about.values.personal')}</h3>
                      <p className="text-sm text-gray-600">{t('about.values.personalDesc')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Heart className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{t('about.values.committed')}</h3>
                      <p className="text-sm text-gray-600">{t('about.values.committedDesc')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Was wir bieten */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('about.services.title')}</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {t('about.services.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <GraduationCap className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('about.services.summer')}</h3>
              <p className="text-sm text-gray-600">
                {t('about.services.summerDesc')}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <Briefcase className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('about.services.seasonal')}</h3>
              <p className="text-sm text-gray-600">
                {t('about.services.seasonalDesc')}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('about.services.skilled')}</h3>
              <p className="text-sm text-gray-600">
                {t('about.services.skilledDesc')}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('about.services.training')}</h3>
              <p className="text-sm text-gray-600">
                {t('about.services.trainingDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Für Bewerber / Für Unternehmen */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Für Bewerber */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{t('about.forApplicants.title')}</h3>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  t('about.forApplicants.benefit1'),
                  t('about.forApplicants.benefit2'),
                  t('about.forApplicants.benefit3'),
                  t('about.forApplicants.benefit4'),
                  t('about.forApplicants.benefit5')
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
              <Link 
                to="/register" 
                className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-700 transition-colors"
              >
                {t('about.forApplicants.cta')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Für Unternehmen */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{t('about.forCompanies.title')}</h3>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  t('about.forCompanies.benefit1'),
                  t('about.forCompanies.benefit2'),
                  t('about.forCompanies.benefit3'),
                  t('about.forCompanies.benefit4'),
                  t('about.forCompanies.benefit5')
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
              <Link 
                to="/register" 
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                {t('about.forCompanies.cta')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Kontakt */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">{t('about.contact.title')}</h2>
            <p className="text-gray-400 mb-8">
              {t('about.contact.subtitle')}
            </p>
            <div className="bg-gray-800 rounded-xl p-6 text-left">
              <p className="font-semibold mb-2">IJP International Job Placement UG</p>
              <p className="text-gray-400">Husemannstr. 9</p>
              <p className="text-gray-400">10435 Berlin</p>
              <p className="text-gray-400 mt-4">E-Mail: service@internationaljobplacement.com</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default About;
