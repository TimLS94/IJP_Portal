import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  HelpCircle, ChevronDown, ChevronUp, Building2, Users, 
  FileText, Clock, Euro, Shield, Mail, CheckCircle,
  Briefcase, Globe, GraduationCap
} from 'lucide-react';

// FAQ Kategorien und Fragen
const faqCategories = [
  {
    id: 'employer',
    title: 'Für Arbeitgeber',
    icon: Building2,
    color: 'bg-blue-100 text-blue-600',
    questions: [
      {
        question: 'Wie registriere ich mein Unternehmen?',
        answer: `Die Registrierung ist einfach und kostenlos:
        
1. Klicken Sie auf "Registrieren" in der Navigation
2. Wählen Sie "Als Unternehmen registrieren"
3. Geben Sie Ihre E-Mail-Adresse und ein sicheres Passwort ein
4. Vervollständigen Sie Ihr Firmenprofil mit Kontaktdaten und Beschreibung
5. Sie können sofort Stellenanzeigen erstellen`
      },
      {
        question: 'Wie erstelle ich eine Stellenanzeige?',
        answer: `Nach der Registrierung und Anmeldung:

1. Gehen Sie zu "Meine Stellenanzeigen" im Dashboard
2. Klicken Sie auf "Neue Stelle erstellen"
3. Füllen Sie alle relevanten Felder aus:
   - Stellentitel und Beschreibung
   - Anforderungen (Sprachkenntnisse, Qualifikationen)
   - Arbeitsort und Gehalt
   - Stellenart (Fachkraft, Ausbildung, Saisonjob, etc.)
4. Veröffentlichen Sie die Stelle

Tipp: Je detaillierter Ihre Angaben, desto passendere Bewerber erhalten Sie.`
      },
      {
        question: 'Welche Kosten entstehen für Arbeitgeber?',
        answer: `Unser Preismodell:

• **Stellenanzeigen schalten:** Kostenlos
• **Bewerberprofile ansehen:** Kostenlos
• **Erfolgsvermittlung:** Provision nur bei erfolgreicher Einstellung

Die genauen Konditionen besprechen wir gerne individuell mit Ihnen. Kontaktieren Sie uns für ein unverbindliches Angebot.`
      },
      {
        question: 'Wie läuft der Bewerbungsprozess ab?',
        answer: `Der Prozess ist transparent und effizient:

1. **Bewerbung eingeht:** Bewerber bewirbt sich auf Ihre Stelle
2. **IJP-Prüfung:** Wir prüfen die Unterlagen auf Vollständigkeit
3. **Weiterleitung:** Geeignete Kandidaten werden an Sie weitergeleitet
4. **Ihre Entscheidung:** Sie prüfen die Bewerbungen und laden zu Gesprächen ein
5. **Einstellung:** Bei Interesse stellen Sie den Kandidaten ein

Sie haben jederzeit Zugriff auf den Status aller Bewerbungen in Ihrem Dashboard.`
      },
      {
        question: 'Welche Unterlagen erhalte ich vom Bewerber?',
        answer: `Je nach Stellenart erhalten Sie:

**Für alle Bewerber:**
• Lebenslauf (CV)
• Passfoto
• Reisepass/Ausweiskopie
• Sprachzertifikate (falls vorhanden)

**Für Fachkräfte zusätzlich:**
• Berufsabschluss/Diplom
• Arbeitszeugnisse
• Qualifikationsnachweise

**Für Studenten/Saisonarbeiter:**
• Immatrikulationsbescheinigung
• Hochschulbescheinigung

Alle Dokumente werden von uns auf Echtheit und Vollständigkeit geprüft.`
      },
      {
        question: 'Aus welchen Ländern kommen die Bewerber?',
        answer: `Unsere Bewerber kommen hauptsächlich aus:

• **Osteuropa:** Ukraine, Moldawien, Georgien, Armenien
• **Zentralasien:** Usbekistan, Kasachstan, Kirgisistan
• **Weitere Länder:** Auf Anfrage

Alle Bewerber haben die erforderlichen Voraussetzungen für eine Arbeitsaufnahme in Deutschland oder wir unterstützen bei der Beschaffung der notwendigen Genehmigungen.`
      },
      {
        question: 'Wie lange werden Bewerberdaten gespeichert?',
        answer: `Gemäß DSGVO gelten folgende Aufbewahrungsfristen:

• **Aktive Bewerbungen:** Solange das Verfahren läuft
• **Abgelehnte Bewerbungen:** 6 Monate nach Abschluss
• **Erfolgreiche Vermittlungen:** Entsprechend gesetzlicher Aufbewahrungspflichten

Sie können jederzeit die Löschung von Bewerberdaten anfordern, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.`
      },
    ]
  },
  {
    id: 'applicant',
    title: 'Für Bewerber',
    icon: Users,
    color: 'bg-green-100 text-green-600',
    questions: [
      {
        question: 'Wie bewerbe ich mich?',
        answer: `So einfach geht's:

1. Registrieren Sie sich kostenlos als Bewerber
2. Vervollständigen Sie Ihr Profil mit allen relevanten Daten
3. Laden Sie Ihre Dokumente hoch (Lebenslauf, Zeugnisse, etc.)
4. Durchsuchen Sie die verfügbaren Stellenangebote
5. Bewerben Sie sich mit einem Klick

Alternativ können Sie auch "IJP beauftragen" - dann suchen wir aktiv nach passenden Stellen für Sie.`
      },
      {
        question: 'Welche Dokumente brauche ich?',
        answer: `Die benötigten Dokumente hängen von der Stellenart ab:

**Studentenferienjob:**
• Reisepass
• Immatrikulationsbescheinigung (mit Übersetzung)
• Passfoto
• BA-Erklärung

**Fachkraft:**
• Reisepass
• Lebenslauf
• Berufsabschluss/Diplom
• Arbeitszeugnisse
• Sprachzertifikat (empfohlen)

**Ausbildung:**
• Reisepass
• Schulzeugnis
• Lebenslauf
• Sprachzertifikat (mind. B1)

Alle Dokumente sollten als PDF hochgeladen werden.`
      },
      {
        question: 'Ist die Vermittlung kostenlos?',
        answer: `**Ja, für Bewerber ist unser Service komplett kostenlos!**

Wir finanzieren uns über Vermittlungsprovisionen, die von den Arbeitgebern gezahlt werden. Für Sie als Bewerber entstehen keine Kosten - weder für die Registrierung, noch für die Bewerbung oder die Vermittlung.`
      },
      {
        question: 'Welche Sprachkenntnisse brauche ich?',
        answer: `Die Anforderungen variieren je nach Stelle:

**Studentenferienjob/Saisonjob:**
• Deutsch: A2-B1 (Grundkenntnisse ausreichend)
• Englisch: Hilfreich, aber nicht zwingend

**Fachkraft:**
• Deutsch: B1-B2 (je nach Beruf)
• Fachspezifische Zertifikate können erforderlich sein

**Ausbildung:**
• Deutsch: Mindestens B1
• Für Berufsschule ist B2 empfohlen

Tipp: Je besser Ihre Deutschkenntnisse, desto mehr Stellenangebote stehen Ihnen offen.`
      },
      {
        question: 'Was ist "IJP beauftragen"?',
        answer: `Mit dieser Funktion beauftragen Sie uns, aktiv nach passenden Stellen für Sie zu suchen:

**Vorteile:**
• Wir durchsuchen unser Netzwerk nach passenden Stellen
• Sie werden über neue Möglichkeiten informiert
• Persönliche Betreuung durch unser Team
• Zugang zu nicht öffentlich ausgeschriebenen Stellen

**So funktioniert's:**
1. Vervollständigen Sie Ihr Profil
2. Wählen Sie Ihre gewünschte(n) Stellenart(en)
3. Klicken Sie auf "IJP beauftragen"
4. Wir suchen aktiv und melden uns bei passenden Angeboten`
      },
    ]
  },
  {
    id: 'legal',
    title: 'Rechtliches & Visa',
    icon: Shield,
    color: 'bg-purple-100 text-purple-600',
    questions: [
      {
        question: 'Brauche ich ein Visum für Deutschland?',
        answer: `Das hängt von Ihrer Nationalität ab:

**EU-Bürger:** Kein Visum erforderlich, freier Arbeitsmarktzugang

**Drittstaatsangehörige:**
• Für kurzfristige Beschäftigung (max. 90 Tage): Oft Arbeitserlaubnis über Bundesagentur für Arbeit
• Für längerfristige Beschäftigung: Arbeitsvisum erforderlich

Wir unterstützen Sie bei der Beantragung der notwendigen Genehmigungen und beraten zu den Voraussetzungen.`
      },
      {
        question: 'Was ist eine kurzfristige Beschäftigung?',
        answer: `Die kurzfristige Beschäftigung ist eine besondere Regelung:

• **Dauer:** Maximal 90 Tage oder 3 Monate im Kalenderjahr
• **Für:** Studenten aus bestimmten Ländern (z.B. Ukraine, Moldawien)
• **Vorteil:** Vereinfachtes Verfahren ohne Aufenthaltstitel

**Voraussetzungen:**
• Gültige Immatrikulationsbescheinigung
• Vermittlung über zugelassene Agentur (wie IJP)
• Zustimmung der Bundesagentur für Arbeit

Wir kümmern uns um alle Formalitäten!`
      },
      {
        question: 'Welche Arbeitszeiten gelten in Deutschland?',
        answer: `In Deutschland gelten folgende Regelungen:

• **Maximale Arbeitszeit:** 8 Stunden/Tag, max. 10 Stunden mit Ausgleich
• **Pausen:** Nach 6 Stunden mind. 30 Min., nach 9 Stunden mind. 45 Min.
• **Ruhezeit:** Mind. 11 Stunden zwischen Arbeitstagen
• **Wochenende:** In der Regel arbeitsfrei (Ausnahmen in bestimmten Branchen)

Mindestlohn (2024): 12,41 €/Stunde`
      },
      {
        question: 'Wie werden meine Daten geschützt?',
        answer: `Datenschutz hat bei uns höchste Priorität:

• Alle Daten werden gemäß DSGVO verarbeitet
• SSL-verschlüsselte Übertragung
• Speicherung auf deutschen Servern
• Weitergabe nur mit Ihrer Zustimmung an potenzielle Arbeitgeber
• Löschung auf Anfrage jederzeit möglich

Mehr Informationen finden Sie in unserer Datenschutzerklärung.`
      },
    ]
  },
  {
    id: 'technical',
    title: 'Technische Fragen',
    icon: HelpCircle,
    color: 'bg-orange-100 text-orange-600',
    questions: [
      {
        question: 'Welche Dateiformate werden unterstützt?',
        answer: `Für Dokumente akzeptieren wir:

• **PDF** (empfohlen) - Maximale Dateigröße: 10 MB

Bitte achten Sie darauf, dass:
• Dokumente gut lesbar sind
• Keine Passwortgeschützten PDFs verwendet werden
• Übersetzungen beglaubigt sind (wenn erforderlich)`
      },
      {
        question: 'Ich habe mein Passwort vergessen',
        answer: `Kein Problem! So setzen Sie es zurück:

1. Gehen Sie zur Login-Seite
2. Klicken Sie auf "Passwort vergessen?"
3. Geben Sie Ihre E-Mail-Adresse ein
4. Sie erhalten einen Link zum Zurücksetzen per E-Mail
5. Wählen Sie ein neues sicheres Passwort

Der Link ist 24 Stunden gültig. Falls Sie keine E-Mail erhalten, prüfen Sie Ihren Spam-Ordner.`
      },
      {
        question: 'Wie kann ich meinen Account löschen?',
        answer: `Sie können Ihren Account jederzeit selbst löschen:

1. Melden Sie sich an
2. Gehen Sie zu "Einstellungen"
3. Scrollen Sie zu "Account löschen"
4. Bestätigen Sie mit Ihrem Passwort und "DELETE"

**Achtung:** Diese Aktion ist unwiderruflich. Alle Ihre Daten, Bewerbungen und Dokumente werden dauerhaft gelöscht.`
      },
      {
        question: 'An wen kann ich mich bei Problemen wenden?',
        answer: `Unser Support-Team hilft Ihnen gerne:

**E-Mail:** service@internationaljobplacement.com

**Kontaktformular:** Über unsere Kontaktseite

Wir antworten in der Regel innerhalb von 24-48 Stunden.`
      },
    ]
  },
];

// Einfacher Markdown-Parser für **fett** und Listen
function formatAnswer(text) {
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
              Häufig gestellte Fragen
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Finden Sie Antworten auf die wichtigsten Fragen rund um IJP und unsere Vermittlung.
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
            <h2 className="text-2xl font-bold mb-2">Noch Fragen?</h2>
            <p className="text-primary-100 mb-6">
              Unser Team beantwortet gerne alle Ihre Fragen persönlich.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-colors"
              >
                <Mail className="h-5 w-5" />
                Kontakt aufnehmen
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-400 transition-colors"
              >
                <CheckCircle className="h-5 w-5" />
                Jetzt registrieren
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default FAQ;
