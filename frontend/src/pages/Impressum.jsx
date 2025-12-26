import { useTranslation } from 'react-i18next';
import { Building2, Mail } from 'lucide-react';

function Impressum() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">{t('impressum.title')}</h1>
          
          <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8">
            {/* Angaben gemäß § 5 TMG */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary-600" />
                {t('impressum.according')}
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
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('impressum.contact')}</h2>
              <div className="text-gray-700 space-y-2">
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  E-Mail: service@internationaljobplacement.com
                </p>
              </div>
            </section>

            {/* Handelsregister */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('impressum.register')}</h2>
              <div className="text-gray-700 space-y-1">
                <p>{t('impressum.registerCourt')}: Amtsgericht Berlin-Charlottenburg</p>
                <p>{t('impressum.registerNumber')}: HRB 207656 B</p>
              </div>
            </section>

            {/* Vertretungsberechtigter */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('impressum.ceo')}</h2>
              <p className="text-gray-700">Tim Schäfer</p>
            </section>

            {/* USt-ID */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('impressum.vatId')}</h2>
              <p className="text-gray-700">
                {t('impressum.vatIdDesc')}:<br />
                DE324792764
              </p>
            </section>

            {/* Streitschlichtung */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('impressum.dispute')}</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  {t('impressum.disputeText1')}{' '}
                  <a 
                    href="https://ec.europa.eu/consumers/odr/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    https://ec.europa.eu/consumers/odr/
                  </a>
                </p>
                <p>{t('impressum.disputeText2')}</p>
              </div>
            </section>

            {/* Haftung für Inhalte */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('impressum.liabilityContent')}</h2>
              <p className="text-gray-700">
                Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den 
                allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht 
                verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.
              </p>
            </section>

            {/* Haftung für Links */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('impressum.liabilityLinks')}</h2>
              <p className="text-gray-700">
                Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. 
                Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
              </p>
            </section>

            {/* Urheberrecht */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('impressum.copyright')}</h2>
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

export default Impressum;
