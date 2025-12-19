import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';

function AGB() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <FileText className="h-10 w-10 text-primary-600" />
            <h1 className="text-4xl font-bold text-gray-900">{t('agb.title')}</h1>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8">
            
            {/* Geltungsbereich */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('agb.scope.title')}</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  (1) Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen der 
                  IJP International Job Placement UG (haftungsbeschränkt), Husemannstr. 9, 10435 Berlin 
                  (nachfolgend "IJP" genannt) und den Nutzern der Plattform ijp-portal.de.
                </p>
                <p>
                  (2) Es gelten ausschließlich diese AGB. Abweichende Bedingungen des Nutzers werden nicht 
                  anerkannt, es sei denn, IJP stimmt ihrer Geltung ausdrücklich schriftlich zu.
                </p>
              </div>
            </section>

            {/* Leistungsbeschreibung */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('agb.services.title')}</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  (1) IJP betreibt eine Online-Plattform zur Vermittlung von Arbeitsverhältnissen zwischen 
                  internationalen Bewerbern und deutschen Unternehmen.
                </p>
                <p>
                  (2) Für Bewerber ist die Nutzung der Plattform kostenlos.
                </p>
                <p>
                  (3) IJP vermittelt keine Arbeitsverhältnisse, sondern stellt lediglich die Plattform zur 
                  Verfügung und unterstützt bei der Kontaktaufnahme zwischen Bewerbern und Unternehmen.
                </p>
              </div>
            </section>

            {/* Registrierung */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('agb.registration.title')}</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  (1) Die Nutzung der wesentlichen Funktionen der Plattform erfordert eine Registrierung.
                </p>
                <p>
                  (2) Der Nutzer ist verpflichtet, bei der Registrierung wahrheitsgemäße und vollständige 
                  Angaben zu machen und diese aktuell zu halten.
                </p>
                <p>
                  (3) Der Nutzer ist für die Geheimhaltung seiner Zugangsdaten selbst verantwortlich.
                </p>
                <p>
                  (4) Ein Anspruch auf Registrierung besteht nicht.
                </p>
              </div>
            </section>

            {/* Pflichten des Nutzers */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('agb.obligations.title')}</h2>
              <div className="text-gray-700 space-y-3">
                <p>Der Nutzer verpflichtet sich:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Nur wahrheitsgemäße Angaben zu machen</li>
                  <li>Keine rechtswidrigen oder irreführenden Inhalte hochzuladen</li>
                  <li>Die Plattform nicht für rechtswidrige Zwecke zu nutzen</li>
                  <li>Keine automatisierten Abfragen einzusetzen</li>
                  <li>Die Rechte Dritter nicht zu verletzen</li>
                </ul>
              </div>
            </section>

            {/* Datenschutz */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('agb.privacy.title')}</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  (1) IJP verarbeitet personenbezogene Daten gemäß der Datenschutzerklärung.
                </p>
                <p>
                  (2) Mit der Nutzung des Services "IJP beauftragen" willigt der Bewerber ein, dass seine 
                  Profildaten an potenzielle Arbeitgeber weitergegeben werden dürfen.
                </p>
                <p>
                  (3) Diese Einwilligung kann jederzeit widerrufen werden.
                </p>
              </div>
            </section>

            {/* Haftung */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('agb.liability.title')}</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  (1) IJP haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit.
                </p>
                <p>
                  (2) Bei leichter Fahrlässigkeit haftet IJP nur bei Verletzung wesentlicher Vertragspflichten.
                </p>
                <p>
                  (3) IJP übernimmt keine Garantie für das Zustandekommen eines Arbeitsverhältnisses.
                </p>
              </div>
            </section>

            {/* Kündigung */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('agb.termination.title')}</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  (1) Der Nutzer kann sein Konto jederzeit ohne Angabe von Gründen löschen lassen.
                </p>
                <p>
                  (2) IJP kann das Nutzerkonto bei Verstößen gegen diese AGB fristlos kündigen.
                </p>
                <p>
                  (3) Nach Löschung werden alle personenbezogenen Daten innerhalb von 30 Tagen gelöscht.
                </p>
              </div>
            </section>

            {/* Änderungen */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('agb.changes.title')}</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  (1) IJP behält sich vor, diese AGB jederzeit zu ändern.
                </p>
                <p>
                  (2) Die Änderungen gelten als genehmigt, wenn der Nutzer nicht innerhalb von 30 Tagen 
                  widerspricht.
                </p>
              </div>
            </section>

            {/* Schlussbestimmungen */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('agb.final.title')}</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  (1) Es gilt das Recht der Bundesrepublik Deutschland.
                </p>
                <p>
                  (2) Gerichtsstand ist, soweit gesetzlich zulässig, Berlin.
                </p>
                <p>
                  (3) Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen 
                  Bestimmungen unberührt.
                </p>
              </div>
            </section>

            <p className="text-gray-500 text-sm pt-4 border-t">
              {t('agb.lastUpdated')}: Dezember 2025
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}

export default AGB;
