import { useTranslation } from 'react-i18next';
import { Shield, Mail } from 'lucide-react';

function Datenschutz() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="h-10 w-10 text-primary-600" />
            <h1 className="text-4xl font-bold text-gray-900">{t('datenschutz.title')}</h1>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8">
            
            {/* Einleitung */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. {t('datenschutz.overview.title')}</h2>
              <div className="text-gray-700 space-y-4">
                <h3 className="font-semibold">{t('datenschutz.overview.subtitle')}</h3>
                <p>{t('datenschutz.overview.text')}</p>
              </div>
            </section>

            {/* Verantwortlicher */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. {t('datenschutz.responsible.title')}</h2>
              <div className="text-gray-700 space-y-2">
                <p className="font-semibold">IJP International Job Placement UG (haftungsbeschränkt)</p>
                <p>Husemannstr. 9</p>
                <p>10435 Berlin</p>
                <p className="mt-4 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-Mail: service@internationaljobplacement.com
                </p>
                <p className="mt-4">{t('datenschutz.responsible.text')}</p>
              </div>
            </section>

            {/* Datenerfassung */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. {t('datenschutz.collection.title')}</h2>
              <div className="text-gray-700 space-y-4">
                <h3 className="font-semibold mt-6">{t('datenschutz.collection.who')}</h3>
                <p>{t('datenschutz.collection.whoText')}</p>
                
                <h3 className="font-semibold mt-6">{t('datenschutz.collection.how')}</h3>
                <p>{t('datenschutz.collection.howText1')}</p>
                <p>{t('datenschutz.collection.howText2')}</p>

                <h3 className="font-semibold mt-6">{t('datenschutz.collection.why')}</h3>
                <p>{t('datenschutz.collection.whyText')}</p>
              </div>
            </section>

            {/* Rechte */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. {t('datenschutz.rights.title')}</h2>
              <div className="text-gray-700 space-y-4">
                <p>{t('datenschutz.rights.text')}</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>{t('datenschutz.rights.access')} (Art. 15 DSGVO)</li>
                  <li>{t('datenschutz.rights.rectification')} (Art. 16 DSGVO)</li>
                  <li>{t('datenschutz.rights.deletion')} (Art. 17 DSGVO)</li>
                  <li>{t('datenschutz.rights.restriction')} (Art. 18 DSGVO)</li>
                  <li>{t('datenschutz.rights.portability')} (Art. 20 DSGVO)</li>
                  <li>{t('datenschutz.rights.objection')} (Art. 21 DSGVO)</li>
                </ul>
              </div>
            </section>

            {/* Registrierung */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. {t('datenschutz.registration.title')}</h2>
              <div className="text-gray-700 space-y-4">
                <p>{t('datenschutz.registration.text')}</p>
                
                <h3 className="font-semibold mt-4">{t('datenschutz.registration.applicantData')}</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Name, Kontaktdaten, Geburtsdatum</li>
                  <li>Qualifikationen, Sprachkenntnisse, Berufserfahrung</li>
                  <li>Bewerbungsunterlagen (Lebenslauf, Zeugnisse etc.)</li>
                </ul>

                <h3 className="font-semibold mt-4">{t('datenschutz.registration.companyData')}</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Firmenname, Anschrift, Kontaktdaten</li>
                  <li>Ansprechpartner und deren Kontaktdaten</li>
                  <li>Stellenangebote und Anforderungsprofile</li>
                </ul>
              </div>
            </section>

            {/* Weitergabe */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. {t('datenschutz.sharing.title')}</h2>
              <p className="text-gray-700">{t('datenschutz.sharing.text')}</p>
            </section>

            {/* Speicherdauer */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. {t('datenschutz.storage.title')}</h2>
              <p className="text-gray-700">{t('datenschutz.storage.text')}</p>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. {t('datenschutz.cookies.title')}</h2>
              <p className="text-gray-700">{t('datenschutz.cookies.text')}</p>
            </section>

            {/* SSL */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. {t('datenschutz.ssl.title')}</h2>
              <p className="text-gray-700">{t('datenschutz.ssl.text')}</p>
            </section>

            {/* Änderungen */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. {t('datenschutz.changes.title')}</h2>
              <p className="text-gray-700">{t('datenschutz.changes.text')}</p>
              <p className="text-gray-500 text-sm mt-4">
                {t('datenschutz.lastUpdated')}: Dezember 2025
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Datenschutz;
