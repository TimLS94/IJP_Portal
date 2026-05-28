/**
 * SEO Utility Functions
 */

/**
 * Generiert die SEO-freundliche Job-URL
 * @param {Object} job - Job-Objekt mit id, slug, title, location, accommodation_provided
 * @returns {string} URL-Pfad wie "/jobs/housekeeping-hallenberg-unterkunft-12"
 */
export function getJobUrl(job) {
  if (!job) return '/jobs';
  
  // Wenn slug vorhanden, nutze diesen
  if (job.slug) {
    return `/jobs/${job.slug}-${job.id}`;
  }
  
  // Fallback: Generiere slug aus Titel und Ort
  const slug = generateSlug(job.title, job.location, job.accommodation_provided);
  return `/jobs/${slug}-${job.id}`;
}

/**
 * Generiert einen URL-freundlichen Slug
 * @param {string} title - Jobtitel
 * @param {string} location - Ort
 * @param {boolean} accommodation - Unterkunft vorhanden
 * @returns {string} Slug wie "housekeeping-hallenberg-unterkunft"
 */
export function generateSlug(title, location, accommodation = false) {
  const parts = [];
  
  if (title) {
    // Entferne (m/w/d), (h/m/d), etc.
    let cleanTitle = title.replace(/\([mwdhfx/]+\)/gi, '');
    // Entferne Sonderzeichen
    cleanTitle = cleanTitle.replace(/[^\w\s-]/g, ' ');
    parts.push(cleanTitle);
  }
  
  if (location) {
    parts.push(location);
  }
  
  if (accommodation) {
    parts.push('unterkunft');
  }
  
  return slugify(parts.join(' '));
}

/**
 * Konvertiert Text in einen URL-freundlichen Slug
 * @param {string} text - Eingabetext
 * @returns {string} Slug
 */
export function slugify(text) {
  if (!text) return '';
  
  // Deutsche Umlaute ersetzen
  const replacements = {
    'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss',
    'Ä': 'ae', 'Ö': 'oe', 'Ü': 'ue',
    'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o',
    'ú': 'u', 'ù': 'u', 'û': 'u',
    'ñ': 'n', 'ç': 'c',
  };
  
  let slug = text;
  for (const [char, replacement] of Object.entries(replacements)) {
    slug = slug.split(char).join(replacement);
  }
  
  // Lowercase
  slug = slug.toLowerCase();
  
  // Nur alphanumerische Zeichen und Bindestriche behalten
  slug = slug.replace(/[^a-z0-9\s-]/g, '');
  
  // Mehrfache Leerzeichen/Bindestriche zu einem Bindestrich
  slug = slug.replace(/[-\s]+/g, '-');
  
  // Führende/trailing Bindestriche entfernen
  slug = slug.replace(/^-+|-+$/g, '');
  
  // Maximal 80 Zeichen
  if (slug.length > 80) {
    slug = slug.substring(0, 80).replace(/-[^-]*$/, '');
  }
  
  return slug;
}

/**
 * Extrahiert die Job-ID aus einem Slug-URL-Parameter
 * @param {string} slugWithId - URL-Parameter wie "housekeeping-hallenberg-12" oder "12"
 * @returns {number|null} Job-ID
 */
export function extractJobId(slugWithId) {
  if (!slugWithId) return null;
  
  // Prüfen ob es nur eine Zahl ist (alte URL-Struktur)
  if (/^\d+$/.test(slugWithId)) {
    return parseInt(slugWithId, 10);
  }
  
  // Versuche ID am Ende zu extrahieren (nach letztem Bindestrich)
  const match = slugWithId.match(/-(\d+)$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  return null;
}

/**
 * Setzt dynamische Meta-Tags für SEO
 * @param {Object} options - Meta-Tag Optionen
 */
export function setMetaTags({ title, description, url, image, type = 'website' }) {
  // Title
  if (title) {
    document.title = title;
    setMetaTag('og:title', title);
    setMetaTag('twitter:title', title);
  }
  
  // Description
  if (description) {
    setMetaTag('description', description);
    setMetaTag('og:description', description);
    setMetaTag('twitter:description', description);
  }
  
  // URL
  if (url) {
    setMetaTag('og:url', url);
    setLinkTag('canonical', url);
  }
  
  // Image
  if (image) {
    setMetaTag('og:image', image);
    setMetaTag('twitter:image', image);
  }
  
  // Type
  setMetaTag('og:type', type);
  setMetaTag('twitter:card', 'summary_large_image');
}

/**
 * Setzt oder aktualisiert einen Meta-Tag
 */
function setMetaTag(name, content) {
  // Prüfe ob es ein property oder name Attribut ist
  const isProperty = name.startsWith('og:') || name.startsWith('twitter:');
  const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  
  let meta = document.querySelector(selector);
  if (!meta) {
    meta = document.createElement('meta');
    if (isProperty) {
      meta.setAttribute('property', name);
    } else {
      meta.setAttribute('name', name);
    }
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

/**
 * Setzt oder aktualisiert einen Link-Tag (z.B. canonical)
 */
function setLinkTag(rel, href) {
  let link = document.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', rel);
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

/**
 * Generiert JobPosting Structured Data (schema.org) für Google Jobs
 * @param {Object} job - Job-Objekt
 * @param {string} baseUrl - Basis-URL der Website
 * @returns {Object} JSON-LD Structured Data
 */
export function generateJobPostingSchema(job, baseUrl = 'https://www.jobon.work') {
  if (!job) return null;
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    'title': job.title,
    'description': stripHtml(job.description),
    'datePosted': job.created_at ? new Date(job.created_at).toISOString().split('T')[0] : undefined,
    'validThrough': job.deadline ? new Date(job.deadline).toISOString() : undefined,
    'employmentType': mapEmploymentType(job.employment_type),
    'jobLocation': {
      '@type': 'Place',
      'address': {
        '@type': 'PostalAddress',
        'addressLocality': job.location || 'Deutschland',
        'addressCountry': 'DE',
        ...(job.postal_code && { 'postalCode': job.postal_code }),
        ...(job.address && { 'streetAddress': job.address }),
      }
    },
    'hiringOrganization': {
      '@type': 'Organization',
      'name': job.company_name || job.company?.name || 'Unbekannt',
      'sameAs': baseUrl,
      ...(job.company_logo && { 'logo': job.company_logo }),
    },
    'url': `${baseUrl}${getJobUrl(job)}`,
  };
  
  // Gehalt hinzufügen wenn vorhanden
  if (job.salary_min || job.salary_max) {
    schema.baseSalary = {
      '@type': 'MonetaryAmount',
      'currency': 'EUR',
      'value': {
        '@type': 'QuantitativeValue',
        ...(job.salary_min && { 'minValue': job.salary_min }),
        ...(job.salary_max && { 'maxValue': job.salary_max }),
        'unitText': mapSalaryType(job.salary_type),
      }
    };
  }
  
  // Remote-Arbeit
  if (job.remote_possible) {
    schema.jobLocationType = 'TELECOMMUTE';
  }
  
  return schema;
}

/**
 * Mappt employment_type auf schema.org Werte
 */
function mapEmploymentType(type) {
  const mapping = {
    'fulltime': 'FULL_TIME',
    'parttime': 'PART_TIME',
    'both': ['FULL_TIME', 'PART_TIME'],
  };
  return mapping[type] || 'FULL_TIME';
}

/**
 * Mappt salary_type auf schema.org Werte
 */
function mapSalaryType(type) {
  const mapping = {
    'hourly': 'HOUR',
    'monthly': 'MONTH',
    'yearly': 'YEAR',
  };
  return mapping[type] || 'HOUR';
}

/**
 * Entfernt HTML-Tags aus einem String
 */
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}
