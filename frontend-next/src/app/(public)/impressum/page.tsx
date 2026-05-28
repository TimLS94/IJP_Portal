import { Metadata } from "next";
import { Building2, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum der IJP International Job Placement UG - Angaben gemäß § 5 TMG, Kontaktdaten, Handelsregister und rechtliche Hinweise.",
  robots: { index: true, follow: true },
};

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Impressum</h1>
          
          <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8">
            {/* Angaben gemäß § 5 TMG */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary-600" />
                Angaben gemäß § 5 TMG
              </h2>
              <div className="text-gray-700 space-y-1">
                <p className="font-semibold">IJP International Job Placement UG (haftungsbeschränkt)</p>
                <p>Husemannstr. 9</p>
                <p>10435 Berlin</p>
                <p>Deutschland</p>
              </div>
            </section>

            {/* Kontakt */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Kontakt</h2>
              <div className="text-gray-700 space-y-2">
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  E-Mail: service@internationaljobplacement.com
                </p>
              </div>
            </section>

            {/* Handelsregister */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Handelsregister</h2>
              <div className="text-gray-700 space-y-1">
                <p>Registergericht: Amtsgericht Berlin-Charlottenburg</p>
                <p>Registernummer: HRB 207656 B</p>
              </div>
            </section>

            {/* Vertretungsberechtigter */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Vertretungsberechtigter Geschäftsführer</h2>
              <p className="text-gray-700">Tim Schäfer</p>
            </section>

            {/* USt-ID */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Umsatzsteuer-ID</h2>
              <p className="text-gray-700">
                Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
                DE324792764
              </p>
            </section>

            {/* Streitschlichtung */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Streitschlichtung</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
                  <a 
                    href="https://ec.europa.eu/consumers/odr/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    https://ec.europa.eu/consumers/odr/
                  </a>
                </p>
                <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
              </div>
            </section>

            {/* Haftung für Inhalte */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Haftung für Inhalte</h2>
              <p className="text-gray-700">
                Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den 
                allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht 
                verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.
              </p>
            </section>

            {/* Haftung für Links */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Haftung für Links</h2>
              <p className="text-gray-700">
                Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. 
                Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
              </p>
            </section>

            {/* Urheberrecht */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Urheberrecht</h2>
              <p className="text-gray-700">
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen 
                Urheberrecht.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
