import { Shield, Mail } from 'lucide-react';

function Datenschutz() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="h-10 w-10 text-primary-600" />
            <h1 className="text-4xl font-bold text-gray-900">Datenschutzerklärung</h1>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8">
            
            {/* Einleitung */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Datenschutz auf einen Blick</h2>
              <div className="text-gray-700 space-y-4">
                <h3 className="font-semibold">Allgemeine Hinweise</h3>
                <p>
                  Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen 
                  Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit 
                  denen Sie persönlich identifiziert werden können.
                </p>
              </div>
            </section>

            {/* Verantwortlicher */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Verantwortliche Stelle</h2>
              <div className="text-gray-700 space-y-2">
                <p className="font-semibold">IJP International Job Placement UG (haftungsbeschränkt)</p>
                <p>c/o Schäfer</p>
                <p>Husemannstr. 9</p>
                <p>10435 Berlin</p>
                <p className="mt-4 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-Mail: datenschutz@ijp-portal.de
                </p>
                <p className="mt-4">
                  Verantwortliche Stelle ist die natürliche oder juristische Person, die allein oder gemeinsam 
                  mit anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten entscheidet.
                </p>
              </div>
            </section>

            {/* Datenerfassung */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Datenerfassung auf dieser Website</h2>
              <div className="text-gray-700 space-y-4">
                <h3 className="font-semibold">Wer ist verantwortlich für die Datenerfassung?</h3>
                <p>
                  Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Die Kontaktdaten 
                  können Sie dem Impressum dieser Website entnehmen.
                </p>
                
                <h3 className="font-semibold mt-6">Wie erfassen wir Ihre Daten?</h3>
                <p>
                  Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich 
                  z.B. um Daten handeln, die Sie in ein Registrierungsformular eingeben.
                </p>
                <p>
                  Andere Daten werden automatisch beim Besuch der Website durch unsere IT-Systeme erfasst. Das 
                  sind vor allem technische Daten (z.B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs).
                </p>

                <h3 className="font-semibold mt-6">Wofür nutzen wir Ihre Daten?</h3>
                <p>
                  Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten. 
                  Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden. Als Jobportal verarbeiten 
                  wir Ihre Bewerberdaten, um Sie mit passenden Stellenangeboten zu verbinden und an potenzielle 
                  Arbeitgeber weiterzuleiten.
                </p>
              </div>
            </section>

            {/* Rechte */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Ihre Rechte</h2>
              <div className="text-gray-700 space-y-4">
                <p>Sie haben jederzeit das Recht:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Auskunft über Ihre gespeicherten Daten zu erhalten (Art. 15 DSGVO)</li>
                  <li>Berichtigung unrichtiger Daten zu verlangen (Art. 16 DSGVO)</li>
                  <li>Löschung Ihrer Daten zu verlangen (Art. 17 DSGVO)</li>
                  <li>Einschränkung der Verarbeitung zu verlangen (Art. 18 DSGVO)</li>
                  <li>Datenübertragbarkeit zu verlangen (Art. 20 DSGVO)</li>
                  <li>Der Verarbeitung zu widersprechen (Art. 21 DSGVO)</li>
                </ul>
                <p className="mt-4">
                  Wenn Sie der Meinung sind, dass die Verarbeitung Ihrer Daten gegen das Datenschutzrecht verstößt, 
                  haben Sie das Recht, sich bei einer Aufsichtsbehörde zu beschweren.
                </p>
              </div>
            </section>

            {/* Registrierung */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Registrierung und Nutzerkonto</h2>
              <div className="text-gray-700 space-y-4">
                <p>
                  Auf unserer Website können Sie sich als Bewerber oder Unternehmen registrieren. Die bei der 
                  Registrierung erhobenen Daten werden für die Erbringung unserer Dienstleistung verwendet.
                </p>
                
                <h3 className="font-semibold mt-4">Für Bewerber erheben wir:</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Name, Kontaktdaten, Geburtsdatum</li>
                  <li>Qualifikationen, Sprachkenntnisse, Berufserfahrung</li>
                  <li>Bewerbungsunterlagen (Lebenslauf, Zeugnisse etc.)</li>
                </ul>

                <h3 className="font-semibold mt-4">Für Unternehmen erheben wir:</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Firmenname, Anschrift, Kontaktdaten</li>
                  <li>Ansprechpartner und deren Kontaktdaten</li>
                  <li>Stellenangebote und Anforderungsprofile</li>
                </ul>

                <p className="mt-4">
                  Die Rechtsgrundlage für die Verarbeitung ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) 
                  sowie Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) bei der Weitergabe an Partnerunternehmen.
                </p>
              </div>
            </section>

            {/* Weitergabe */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Weitergabe von Daten</h2>
              <div className="text-gray-700 space-y-4">
                <p>
                  Als Vermittlungsplattform geben wir Ihre Bewerberdaten auf Ihre ausdrückliche Einwilligung hin 
                  an potenzielle Arbeitgeber weiter. Dies geschieht nur:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Wenn Sie sich aktiv auf eine Stelle bewerben</li>
                  <li>Wenn Sie IJP beauftragen, passende Jobs für Sie zu finden (mit Ihrer Zustimmung)</li>
                </ul>
                <p className="mt-4">
                  Sie können Ihre Einwilligung jederzeit widerrufen. Bereits übermittelte Daten können jedoch 
                  beim Empfänger verbleiben.
                </p>
              </div>
            </section>

            {/* Speicherdauer */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Speicherdauer</h2>
              <div className="text-gray-700 space-y-4">
                <p>
                  Wir speichern Ihre Daten, solange Ihr Nutzerkonto aktiv ist. Nach Löschung Ihres Kontos werden 
                  Ihre Daten innerhalb von 30 Tagen vollständig gelöscht, sofern keine gesetzlichen 
                  Aufbewahrungspflichten bestehen.
                </p>
                <p>
                  Bewerbungsunterlagen, die an Unternehmen weitergeleitet wurden, unterliegen den 
                  Datenschutzbestimmungen des jeweiligen Unternehmens.
                </p>
              </div>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Cookies</h2>
              <div className="text-gray-700 space-y-4">
                <p>
                  Unsere Website verwendet technisch notwendige Cookies, die für den Betrieb der Website 
                  erforderlich sind. Diese Cookies speichern z.B. Ihre Anmeldeinformationen während einer Sitzung.
                </p>
                <p>
                  Sie können Ihren Browser so einstellen, dass Sie über das Setzen von Cookies informiert werden 
                  und Cookies nur im Einzelfall erlauben. Bei der Deaktivierung von Cookies kann die Funktionalität 
                  dieser Website eingeschränkt sein.
                </p>
              </div>
            </section>

            {/* SSL */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. SSL-Verschlüsselung</h2>
              <p className="text-gray-700">
                Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte 
                eine SSL-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile 
                des Browsers von "http://" auf "https://" wechselt und an dem Schloss-Symbol in Ihrer Browserzeile.
              </p>
            </section>

            {/* Änderungen */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Änderung dieser Datenschutzerklärung</h2>
              <p className="text-gray-700">
                Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen 
                rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen umzusetzen. 
                Für Ihren erneuten Besuch gilt dann die neue Datenschutzerklärung.
              </p>
              <p className="text-gray-500 text-sm mt-4">
                Stand: Dezember 2025
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Datenschutz;
