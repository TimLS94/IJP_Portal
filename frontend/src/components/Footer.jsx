import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ExternalLink } from 'lucide-react';

function Footer() {
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
              Ihre Brücke zu internationalen Karrieremöglichkeiten in Deutschland.
            </p>
            <div className="space-y-2 text-sm">
              <p className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary-400" />
                <span>
                  IJP International Job Placement UG<br />
                  c/o Schäfer<br />
                  Husemannstr. 9<br />
                  10435 Berlin
                </span>
              </p>
            </div>
          </div>

          {/* Für Bewerber */}
          <div>
            <h3 className="text-white font-semibold mb-4">Für Bewerber</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/jobs" className="hover:text-primary-400 transition-colors">
                  Stellenangebote
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-primary-400 transition-colors">
                  Kostenlos registrieren
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-primary-400 transition-colors">
                  Blog & Ratgeber
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-primary-400 transition-colors">
                  Über IJP
                </Link>
              </li>
            </ul>
          </div>

          {/* Für Unternehmen */}
          <div>
            <h3 className="text-white font-semibold mb-4">Für Unternehmen</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/register" className="hover:text-primary-400 transition-colors">
                  Als Firma registrieren
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-primary-400 transition-colors">
                  Unsere Leistungen
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-primary-400 transition-colors">
                  Aktuelles
                </Link>
              </li>
            </ul>
          </div>

          {/* Rechtliches */}
          <div>
            <h3 className="text-white font-semibold mb-4">Rechtliches</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/impressum" className="hover:text-primary-400 transition-colors">
                  Impressum
                </Link>
              </li>
              <li>
                <Link to="/datenschutz" className="hover:text-primary-400 transition-colors">
                  Datenschutz
                </Link>
              </li>
              <li>
                <Link to="/agb" className="hover:text-primary-400 transition-colors">
                  AGB
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
            <p>© {currentYear} IJP International Job Placement UG. Alle Rechte vorbehalten.</p>
            <div className="flex items-center gap-4">
              <Link to="/impressum" className="hover:text-gray-300 transition-colors">
                Impressum
              </Link>
              <span>•</span>
              <Link to="/datenschutz" className="hover:text-gray-300 transition-colors">
                Datenschutz
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
