import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  GraduationCap, Leaf, Plane, Briefcase, BookOpen,
  Clock, FileText, Globe, Users, CheckCircle, ArrowRight,
  Calendar, MapPin, Euro, Info
} from 'lucide-react';

const categories = [
  {
    id: 'studentenferienjob',
    icon: GraduationCap,
    emoji: '🎓',
    color: 'blue',
    gradient: 'from-blue-500 to-blue-600',
    title: 'Studentenferienjob',
    subtitle: 'Für ausländische Studierende',
    shortDesc: 'Arbeiten Sie in den Semesterferien in Deutschland und sammeln Sie wertvolle Berufserfahrung.',
    description: `Der Studentenferienjob ermöglicht es Studierenden aus dem Ausland, während ihrer Semesterferien in Deutschland zu arbeiten. 
    Dies ist eine hervorragende Möglichkeit, praktische Berufserfahrung zu sammeln, die deutsche Kultur kennenzulernen und gleichzeitig Geld zu verdienen.`,
    forWhom: [
      'Studierende an ausländischen Hochschulen',
      'Aktive Immatrikulation erforderlich',
      'Alle Nationalitäten (auch Nicht-EU)',
    ],
    requirements: [
      'Gültiger Reisepass',
      'Immatrikulationsbescheinigung (Original)',
      'Übersetzung der Immatrikulation (DE/EN)',
      'Lebenslauf mit Foto',
    ],
    duration: 'Maximal 90 Tage (3 Monate) pro Jahr',
    legalBasis: '§ 14 Abs. 2 BeschV - Beschäftigungsverordnung',
    salary: '12,82 € - 15,00 € pro Stunde (Mindestlohn + Zuschläge)',
    sectors: ['Landwirtschaft', 'Gastronomie', 'Logistik', 'Produktion', 'Tourismus'],
    process: [
      'Registrierung auf JobOn',
      'Profil & Dokumente hochladen',
      'Bewerbung auf passende Stellen',
      'IJP prüft Unterlagen',
      'Arbeitsvertrag & Visumsunterstützung',
    ],
  },
  {
    id: 'saisonjob',
    icon: Leaf,
    emoji: '🌾',
    color: 'orange',
    gradient: 'from-orange-500 to-orange-600',
    title: 'Saisonjob',
    subtitle: 'Kurzzeitige kontingentierte Beschäftigung',
    shortDesc: 'Saisonale Arbeit in der Landwirtschaft, Gastronomie oder im Tourismus.',
    description: `Saisonjobs sind kurzzeitige Beschäftigungen für saisonale Arbeiten, besonders in der Landwirtschaft (Ernte), 
    Gastronomie und im Tourismus. Diese Stellen sind ideal für Personen, die flexible, zeitlich begrenzte Arbeit suchen.`,
    forWhom: [
      'Personen aus Drittstaaten',
      'Keine spezifische Ausbildung erforderlich',
      'Körperliche Fitness von Vorteil',
    ],
    requirements: [
      'Gültiger Reisepass',
      'Lebenslauf (optional)',
      'Arbeitszeugnisse (optional)',
    ],
    duration: 'Maximal 90 Tage pro Jahr',
    legalBasis: '§ 15a BeschV - Kurzfristige kontingentierte Beschäftigung',
    salary: '12,82 € - 14,00 € pro Stunde',
    sectors: ['Landwirtschaft (Ernte)', 'Weinbau', 'Gastronomie', 'Hotels', 'Freizeitparks'],
    process: [
      'Registrierung auf JobOn',
      'Reisepass hochladen',
      'Bewerbung auf Saisonstellen',
      'Arbeitsvertrag erhalten',
      'Einreise mit Arbeitserlaubnis',
    ],
  },
  {
    id: 'workandholiday',
    icon: Plane,
    emoji: '✈️',
    color: 'teal',
    gradient: 'from-teal-500 to-teal-600',
    title: 'Work & Holiday',
    subtitle: 'Working Holiday Visum',
    shortDesc: 'Arbeiten und Reisen in Deutschland für junge Menschen aus Partnerländern.',
    description: `Das Working Holiday Programm ermöglicht jungen Menschen aus bestimmten Partnerländern, bis zu 12 Monate in Deutschland 
    zu arbeiten und zu reisen. Es ist eine einzigartige Gelegenheit, die deutsche Kultur intensiv kennenzulernen und gleichzeitig zu arbeiten.`,
    forWhom: [
      'Junge Menschen zwischen 18 und 30 Jahren',
      'Staatsbürger aus: Argentinien, Australien, Chile, Hongkong, Israel, Japan, Kanada, Neuseeland, Südkorea, Taiwan, Uruguay',
      'Grundkenntnisse in Deutsch oder Englisch',
    ],
    requirements: [
      'Gültiger Reisepass aus Partnerland',
      'Lebenslauf',
      'Working Holiday Visum (optional vorab)',
      'Sprachzertifikat (empfohlen)',
    ],
    duration: 'Bis zu 12 Monate',
    legalBasis: 'Bilaterale Abkommen - Working Holiday Programm',
    salary: '12,82 € - 16,00 € pro Stunde (je nach Branche)',
    sectors: ['Gastronomie', 'Tourismus', 'Au-pair', 'Landwirtschaft', 'Einzelhandel', 'Büroarbeit'],
    process: [
      'Visum bei deutscher Botschaft beantragen',
      'Registrierung auf JobOn',
      'Profil erstellen & Dokumente hochladen',
      'Jobs suchen und bewerben',
      'Flexibel arbeiten und reisen',
    ],
  },
  {
    id: 'fachkraft',
    icon: Briefcase,
    emoji: '👔',
    color: 'purple',
    gradient: 'from-purple-500 to-purple-600',
    title: 'Fachkraft',
    subtitle: 'Qualifizierte Beschäftigung',
    shortDesc: 'Langfristige Beschäftigung für qualifizierte Arbeitskräfte mit anerkanntem Abschluss.',
    description: `Das Fachkräftevisum ermöglicht qualifizierten Arbeitskräften aus Nicht-EU-Ländern, langfristig in Deutschland zu arbeiten. 
    Voraussetzung ist eine anerkannte Berufsausbildung oder ein Hochschulabschluss. Dies ist der Weg für eine dauerhafte Karriere in Deutschland.`,
    forWhom: [
      'Personen mit anerkannter Berufsausbildung',
      'Hochschulabsolventen',
      'Berufserfahrene Fachkräfte',
    ],
    requirements: [
      'Gültiger Reisepass',
      'Anerkannter Abschluss (oder Anerkennungsverfahren)',
      'Lebenslauf',
      'Arbeitszeugnisse',
      'Sprachzertifikat (mind. B1 empfohlen)',
    ],
    duration: 'Unbefristet möglich (mit Aufenthaltstitel)',
    legalBasis: 'Fachkräfteeinwanderungsgesetz (FEG)',
    salary: '2.500 € - 5.000 € brutto/Monat (je nach Qualifikation)',
    sectors: ['IT & Technologie', 'Ingenieurwesen', 'Pflege & Medizin', 'Handwerk', 'Logistik'],
    process: [
      'Anerkennung des Abschlusses prüfen/beantragen',
      'Registrierung auf JobOn',
      'Stellensuche und Bewerbung',
      'Arbeitsvertrag erhalten',
      'Visum beantragen (beschleunigtes Verfahren möglich)',
      'Einreise und Arbeitsaufnahme',
    ],
  },
  {
    id: 'ausbildung',
    icon: BookOpen,
    emoji: '📚',
    color: 'green',
    gradient: 'from-green-500 to-green-600',
    title: 'Ausbildung',
    subtitle: 'Duale Berufsausbildung',
    shortDesc: 'Berufsausbildung in Deutschland - Theorie und Praxis kombiniert.',
    description: `Die duale Berufsausbildung in Deutschland kombiniert praktische Arbeit im Betrieb mit theoretischem Unterricht 
    in der Berufsschule. Sie ist weltweit anerkannt und bietet exzellente Karrierechancen nach Abschluss.`,
    forWhom: [
      'Junge Menschen (meist 16-35 Jahre)',
      'Schulabschluss (Haupt-/Realschule oder Abitur)',
      'Interesse an praktischer Ausbildung',
    ],
    requirements: [
      'Gültiger Reisepass',
      'Schulzeugnisse (mit Übersetzung)',
      'Lebenslauf',
      'Sprachzertifikat (mind. B1)',
      'Motivationsschreiben',
    ],
    duration: '2 - 3,5 Jahre (je nach Beruf)',
    legalBasis: 'Aufenthaltserlaubnis zur Berufsausbildung (§ 16a AufenthG)',
    salary: '800 € - 1.400 € brutto/Monat (Ausbildungsvergütung)',
    sectors: ['Handwerk', 'Industrie', 'Pflege', 'Gastronomie', 'IT', 'Kaufmännische Berufe'],
    process: [
      'Deutschkenntnisse aufbauen (B1 Niveau)',
      'Registrierung auf JobOn',
      'Ausbildungsplatz suchen',
      'Ausbildungsvertrag erhalten',
      'Visum beantragen',
      'Ausbildung starten',
      'Nach Abschluss: Aufenthaltserlaubnis zur Arbeitssuche',
    ],
  },
];

function CategoryCard({ category, isExpanded, onToggle }) {
  const Icon = category.icon;
  
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
            <h3 className="text-2xl font-bold">{category.title}</h3>
            <p className="text-white/80">{category.subtitle}</p>
          </div>
          <ArrowRight className={`h-6 w-6 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
        <p className="mt-4 text-white/90">{category.shortDesc}</p>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <p className="text-gray-700 leading-relaxed">{category.description}</p>
          </div>

          {/* Grid Info */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Für wen */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-primary-600" />
                Für wen geeignet?
              </h4>
              <ul className="space-y-2">
                {category.forWhom.map((item, i) => (
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
                Benötigte Dokumente
              </h4>
              <ul className="space-y-2">
                {category.requirements.map((item, i) => (
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
              <p className="text-xs text-gray-600">Dauer</p>
              <p className="font-bold text-gray-900 text-sm">{category.duration}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <Euro className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-xs text-gray-600">Verdienst</p>
              <p className="font-bold text-gray-900 text-sm">{category.salary}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <Globe className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <p className="text-xs text-gray-600">Rechtliche Grundlage</p>
              <p className="font-bold text-gray-900 text-xs">{category.legalBasis}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <MapPin className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <p className="text-xs text-gray-600">Branchen</p>
              <p className="font-bold text-gray-900 text-xs">{category.sectors.slice(0, 3).join(', ')}</p>
            </div>
          </div>

          {/* Process */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
            <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Info className="h-5 w-5 text-primary-600" />
              So funktioniert's
            </h4>
            <div className="flex flex-wrap gap-2">
              {category.process.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full bg-gradient-to-r ${category.gradient} text-white text-xs flex items-center justify-center font-bold`}>
                    {i + 1}
                  </span>
                  <span className="text-gray-700 text-sm">{step}</span>
                  {i < category.process.length - 1 && (
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
              Passende Jobs finden
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/register"
              className="border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-bold hover:border-primary-500 hover:text-primary-600 transition-all"
            >
              Jetzt registrieren
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

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Stellenarten im Überblick
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Deutschland bietet verschiedene Möglichkeiten für internationale Arbeitskräfte. 
          Finden Sie heraus, welche Option am besten zu Ihnen passt.
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
            {cat.emoji} {cat.title}
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
          />
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="mt-12 bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-center text-white">
        <h2 className="text-2xl font-bold mb-4">Noch unsicher?</h2>
        <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
          Kontaktieren Sie uns und wir helfen Ihnen, die passende Stellenart für Ihre Situation zu finden.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link 
            to="/contact" 
            className="bg-white text-primary-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all"
          >
            Kontakt aufnehmen
          </Link>
          <Link 
            to="/faq" 
            className="border-2 border-white text-white px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition-all"
          >
            Häufige Fragen
          </Link>
        </div>
      </div>
    </div>
  );
}

