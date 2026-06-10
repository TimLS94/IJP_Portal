import { Metadata } from "next";
import { Accessibility, Mail, Info, MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Erklärung zur Barrierefreiheit",
  description:
    "Erklärung zur Barrierefreiheit der Plattform JobOn (jobon.work). Informationen zum Stand der Barrierefreiheit, bekannten Einschränkungen und zur Meldung von Barrieren.",
  robots: { index: true, follow: true },
};

export default function BarrierefreiheitPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Accessibility className="h-8 w-8 text-primary-600" />
            Erklärung zur Barrierefreiheit
          </h1>
          <p className="text-gray-500 mb-8">Stand: Juni 2026</p>

          <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8 text-gray-700 leading-relaxed">

            {/* Einleitung */}
            <section>
              <p>
                Die IJP International Job Placement UG (haftungsbeschränkt) betreibt die Online-Plattform
                JobOn (<a href="https://www.jobon.work" className="text-primary-600 hover:underline">www.jobon.work</a>).
                Wir möchten unsere Plattform möglichst vielen Menschen zugänglich machen und arbeiten
                kontinuierlich daran, die Barrierefreiheit zu verbessern.
              </p>
            </section>

            {/* Orientierung an Normen */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Rechtlicher Rahmen und Maßstäbe</h2>
              <p>
                Bei der Gestaltung und Weiterentwicklung orientieren wir uns an den Web Content Accessibility
                Guidelines (WCAG) in der Fassung 2.1, der europäischen Norm EN 301 549 sowie den Zielen des
                Barrierefreiheitsstärkungsgesetzes (BFSG). Diese Erklärung beruht auf einer Selbstbewertung;
                eine Prüfung durch eine externe Stelle hat nicht stattgefunden.
              </p>
            </section>

            {/* Stand der Barrierefreiheit – ehrlich */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Stand der Barrierefreiheit</h2>
              <p>
                Diese Plattform ist nach unserer eigenen Einschätzung <strong>teilweise barrierefrei</strong>.
                Sie befindet sich in fortlaufender Optimierung. Das bedeutet, dass einzelne Inhalte oder
                Funktionen derzeit möglicherweise noch nicht vollständig barrierefrei nutzbar sind.
              </p>
            </section>

            {/* Bereits umgesetzte Maßnahmen – nur Verifizierbares, vorsichtig */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Umgesetzte Maßnahmen</h2>
              <p className="mb-2">Unter anderem haben wir folgende Maßnahmen umgesetzt bzw. arbeiten daran:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>responsives Design für die Nutzung auf unterschiedlichen Geräten und Bildschirmgrößen</li>
                <li>Bereitstellung der Inhalte in mehreren Sprachen (Deutsch, Englisch, Spanisch, Russisch)</li>
                <li>Verwendung einer strukturierten Seitengliederung mit Überschriften</li>
                <li>fortlaufende Verbesserung von Farbkontrasten und der Bedienung per Tastatur</li>
              </ul>
            </section>

            {/* Bekannte Einschränkungen – ehrlich, ohne erfundenes Audit */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Info className="h-5 w-5 text-amber-500" />
                Bekannte Einschränkungen
              </h2>
              <p>
                Trotz unserer Bemühungen können nicht alle Bereiche bereits vollständig barrierefrei sein.
                Einzelne Bedienelemente, Farbkontraste oder dynamische Inhalte werden derzeit weiter
                überarbeitet. Sollten Ihnen Barrieren auffallen, freuen wir uns über einen Hinweis (siehe unten).
              </p>
            </section>

            {/* Barriere melden / Feedback – wichtig */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary-600" />
                Barrieren melden &amp; Feedback
              </h2>
              <p className="mb-3">
                Sind Ihnen Barrieren bei der Nutzung von JobOn aufgefallen oder benötigen Sie Informationen
                in einer barrierefreien Form? Bitte teilen Sie uns das mit – wir bemühen uns, Ihr Anliegen
                zeitnah zu bearbeiten.
              </p>
              <p className="flex items-center gap-2 font-medium text-gray-900">
                <Mail className="h-4 w-4 text-gray-400" />
                <a href="mailto:business@jobon.work" className="text-primary-600 hover:underline">
                  business@jobon.work
                </a>
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Bitte beschreiben Sie möglichst genau, welche Seite und welches Problem betroffen ist.
              </p>
            </section>

            {/* Verantwortliche Stelle */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Verantwortliche Stelle</h2>
              <div className="space-y-1">
                <p className="font-semibold">IJP International Job Placement UG (haftungsbeschränkt)</p>
                <p>Husemannstr. 9</p>
                <p>10435 Berlin</p>
                <p>Deutschland</p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
