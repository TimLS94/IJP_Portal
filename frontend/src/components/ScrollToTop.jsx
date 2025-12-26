import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop - Scrollt automatisch nach oben bei Seitenwechsel
 * Wird im Router eingebunden um bei jeder Navigation nach oben zu scrollen
 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll nach oben bei jedem Routenwechsel
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // 'smooth' für animiertes Scrollen
    });
  }, [pathname]);

  return null;
}

export default ScrollToTop;
