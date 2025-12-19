import { Link } from 'react-router-dom';
import { 
  Users, Globe, Briefcase, Award, CheckCircle, ArrowRight,
  Building2, GraduationCap, UserCheck, Target, Heart
} from 'lucide-react';

function About() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Über IJP
            </h1>
            <p className="text-xl text-primary-100">
              Wir verbinden internationale Talente mit deutschen Unternehmen – 
              für eine erfolgreiche Zusammenarbeit über Grenzen hinweg.
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
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Unsere Mission</h2>
                <p className="text-gray-600 mb-4">
                  IJP – International Job Placement wurde gegründet, um internationalen Fachkräften 
                  und Studenten den Weg nach Deutschland zu ebnen und gleichzeitig deutschen 
                  Unternehmen Zugang zu motivierten und qualifizierten Arbeitskräften zu ermöglichen.
                </p>
                <p className="text-gray-600">
                  Wir verstehen die Herausforderungen auf beiden Seiten und bieten eine Plattform, 
                  die den gesamten Vermittlungsprozess transparent, effizient und persönlich gestaltet.
                </p>
              </div>
              <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl p-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Target className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Zielgerichtet</h3>
                      <p className="text-sm text-gray-600">Passende Jobs für Ihre Qualifikationen</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <UserCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Persönlich</h3>
                      <p className="text-sm text-gray-600">Individuelle Betreuung für jeden Bewerber</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Heart className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Engagiert</h3>
                      <p className="text-sm text-gray-600">Wir begleiten Sie bis zum Erfolg</p>
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Unsere Leistungen</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Von der ersten Bewerbung bis zum erfolgreichen Arbeitsantritt – wir unterstützen Sie bei jedem Schritt.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <GraduationCap className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Studentenferienjobs</h3>
              <p className="text-sm text-gray-600">
                Sommerjobs in Deutschland für internationale Studierende während der Semesterferien.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <Briefcase className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Saisonarbeit</h3>
              <p className="text-sm text-gray-600">
                Saisonale Beschäftigung in Landwirtschaft, Gastronomie und anderen Branchen.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Fachkräfte</h3>
              <p className="text-sm text-gray-600">
                Vermittlung qualifizierter Fachkräfte für dauerhafte Beschäftigung in Deutschland.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Ausbildung</h3>
              <p className="text-sm text-gray-600">
                Ausbildungsplätze für junge Talente, die ihre Karriere in Deutschland starten möchten.
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
                <h3 className="text-2xl font-bold text-gray-900">Für Bewerber</h3>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  'Kostenlose Registrierung und Profilerstellung',
                  'Zugang zu exklusiven Stellenangeboten',
                  'Persönliche Betreuung durch unser Team',
                  'Unterstützung bei Visum und Dokumenten',
                  'Tipps für Vorstellungsgespräche'
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
                Jetzt registrieren
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Für Unternehmen */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Für Unternehmen</h3>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  'Zugang zu motivierten internationalen Bewerbern',
                  'Vorgeprüfte und qualifizierte Kandidaten',
                  'Einfache Stellenausschreibung',
                  'Direkter Kontakt zu Bewerbern',
                  'Unterstützung beim Einstellungsprozess'
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
                Firma registrieren
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
            <h2 className="text-3xl font-bold mb-4">Haben Sie Fragen?</h2>
            <p className="text-gray-400 mb-8">
              Unser Team steht Ihnen gerne zur Verfügung. Kontaktieren Sie uns für weitere Informationen.
            </p>
            <div className="bg-gray-800 rounded-xl p-6 text-left">
              <p className="font-semibold mb-2">IJP International Job Placement UG</p>
              <p className="text-gray-400">c/o Schäfer</p>
              <p className="text-gray-400">Husemannstr. 9</p>
              <p className="text-gray-400">10435 Berlin</p>
              <p className="text-gray-400 mt-4">E-Mail: info@ijp-portal.de</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default About;
