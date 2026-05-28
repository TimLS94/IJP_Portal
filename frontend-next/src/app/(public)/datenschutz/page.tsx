import { Metadata } from "next";
import { Shield, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: "Datenschutzerklärung der IJP International Job Placement UG - Informationen zur Datenverarbeitung, Ihren Rechten und Cookies gemäß DSGVO.",
  robots: { index: true, follow: true },
};

export default function DatenschutzPage() {
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
                <p>Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen.</p>
              </div>
            </section>

            {/* Verantwortlicher */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Verantwortlicher</h2>
              <div className="text-gray-700 space-y-2">
                <p className="font-semibold">IJP International Job Placement UG (haftungsbeschränkt)</p>
                <p>Husemannstr. 9</p>
                <p>10435 Berlin</p>
                <p className="mt-4 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-Mail: service@internationaljobplacement.com
                </p>
                <p className="mt-4">Verantwortliche Stelle ist die natürliche oder juristische Person, die allein oder gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten entscheidet.</p>
              </div>
            </section>

            {/* Datenerfassung */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Datenerfassung auf dieser Website</h2>
              <div className="text-gray-700 space-y-4">
                <h3 className="font-semibold mt-6">Wer ist verantwortlich für die Datenerfassung?</h3>
                <p>Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum entnehmen.</p>
                
                <h3 className="font-semibold mt-6">Wie erfassen wir Ihre Daten?</h3>
                <p>Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z.B. um Daten handeln, die Sie in ein Kontaktformular eingeben.</p>
                <p>Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst.</p>

                <h3 className="font-semibold mt-6">Wofür nutzen wir Ihre Daten?</h3>
                <p>Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden.</p>
              </div>
            </section>

            {/* Rechte */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Ihre Rechte</h2>
              <div className="text-gray-700 space-y-4">
                <p>Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten.</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
                  <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
                  <li>Recht auf Löschung (Art. 17 DSGVO)</li>
                  <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
                  <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
                  <li>Widerspruchsrecht (Art. 21 DSGVO)</li>
                </ul>
              </div>
            </section>

            {/* Registrierung */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Registrierung auf dieser Website</h2>
              <div className="text-gray-700 space-y-4">
                <p>Sie können sich auf dieser Website registrieren, um zusätzliche Funktionen zu nutzen. Die dazu eingegebenen Daten verwenden wir nur zum Zwecke der Nutzung des jeweiligen Angebotes.</p>
                
                <h3 className="font-semibold mt-4">Daten von Bewerbern</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Name, Kontaktdaten, Geburtsdatum</li>
                  <li>Qualifikationen, Sprachkenntnisse, Berufserfahrung</li>
                  <li>Bewerbungsunterlagen (Lebenslauf, Zeugnisse etc.)</li>
                </ul>

                <h3 className="font-semibold mt-4">Daten von Unternehmen</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Firmenname, Anschrift, Kontaktdaten</li>
                  <li>Ansprechpartner und deren Kontaktdaten</li>
                  <li>Stellenangebote und Anforderungsprofile</li>
                </ul>
              </div>
            </section>

            {/* Weitergabe */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Weitergabe von Daten</h2>
              <p className="text-gray-700">Eine Übermittlung Ihrer persönlichen Daten an Dritte zu anderen als den im Folgenden aufgeführten Zwecken findet nicht statt. Wir geben Ihre persönlichen Daten nur an Dritte weiter, wenn Sie Ihre ausdrückliche Einwilligung dazu erteilt haben.</p>
            </section>

            {/* Speicherdauer */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Speicherdauer</h2>
              <p className="text-gray-700">Wir speichern Ihre personenbezogenen Daten nur so lange, wie es für die Erfüllung der Zwecke, für die sie erhoben wurden, erforderlich ist oder wie es die gesetzlichen Aufbewahrungsfristen vorsehen.</p>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Cookies</h2>
              <p className="text-gray-700">Diese Website verwendet Cookies. Cookies sind kleine Textdateien, die auf Ihrem Rechner abgelegt werden und die Ihr Browser speichert. Sie dienen dazu, unser Angebot nutzerfreundlicher und effektiver zu machen.</p>
            </section>

            {/* SSL */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. SSL-Verschlüsselung</h2>
              <p className="text-gray-700">Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte eine SSL-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von &quot;http://&quot; auf &quot;https://&quot; wechselt.</p>
            </section>

            {/* Änderungen */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Änderungen dieser Datenschutzerklärung</h2>
              <p className="text-gray-700">Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht.</p>
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
