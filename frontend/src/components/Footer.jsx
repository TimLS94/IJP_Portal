import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';

function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Firma */}
          <div>
            <img 
              src="/logo.png" 
              alt="IJP Logo" 
              className="h-10 w-auto mb-4 brightness-0 invert"
            />
            <p className="text-sm text-gray-400 mb-4">
              {t('footer.description')}
            </p>
            <div className="space-y-2 text-sm">
              <p className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary-400" />
                <span>
                  IJP International Job Placement UG<br />
                  Husemannstr. 9<br />
                  10435 Berlin
                </span>
              </p>
            </div>
          </div>

          {/* Für Bewerber */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.forApplicants')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/jobs" className="hover:text-primary-400 transition-colors">
                  {t('nav.jobs')}
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-primary-400 transition-colors">
                  {t('nav.register')}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-primary-400 transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-primary-400 transition-colors">
                  {t('nav.about')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Für Unternehmen */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.forCompanies')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/register" className="hover:text-primary-400 transition-colors">
                  {t('nav.register')}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-primary-400 transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-primary-400 transition-colors">
                  {t('nav.about')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Rechtliches & Kontakt */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.legal')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/contact" className="hover:text-primary-400 transition-colors">
                  Kontakt
                </Link>
              </li>
              <li>
                <Link to="/impressum" className="hover:text-primary-400 transition-colors">
                  {t('impressum.title')}
                </Link>
              </li>
              <li>
                <Link to="/datenschutz" className="hover:text-primary-400 transition-colors">
                  {t('datenschutz.title')}
                </Link>
              </li>
              <li>
                <Link to="/agb" className="hover:text-primary-400 transition-colors">
                  {t('agb.title')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <p>© {currentYear} {t('footer.copyright')}</p>
            <div className="flex items-center gap-4">
              <Link to="/impressum" className="hover:text-gray-300 transition-colors">
                {t('impressum.title')}
              </Link>
              <span>•</span>
              <Link to="/datenschutz" className="hover:text-gray-300 transition-colors">
                {t('datenschutz.title')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
