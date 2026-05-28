import { Metadata } from "next";
import { notFound } from "next/navigation";
import CompanyProfileClient from "./CompanyProfileClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ijp-portal.onrender.com/api/v1";

interface Company {
  id: number;
  company_name: string;
  logo?: string;
  industry?: string;
  description?: string;
  city?: string;
  country?: string;
  website?: string;
  contact_email?: string;
  contact_phone?: string;
}

interface Job {
  id: number;
  slug?: string;
  title: string;
  location?: string;
  position_type?: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  created_at: string;
  is_active: boolean;
}

async function getCompany(id: string): Promise<Company | null> {
  try {
    const res = await fetch(`${API_URL}/companies/${id}`, {
      next: { revalidate: 60 }, // Cache für 1 Minute
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function getCompanyJobs(id: string): Promise<Job[]> {
  try {
    const res = await fetch(`${API_URL}/companies/${id}/jobs`, {
      next: { revalidate: 60 }, // Cache für 1 Minute
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const company = await getCompany(id);

  if (!company) {
    return { title: "Unternehmen nicht gefunden" };
  }

  return {
    title: `${company.company_name} - Firmenprofil`,
    description: company.description?.substring(0, 160) || `${company.company_name} - Stellenangebote und Firmenprofil`,
    openGraph: {
      title: company.company_name,
      description: company.description?.substring(0, 160) || `Stellenangebote bei ${company.company_name}`,
      images: company.logo ? [company.logo] : [],
    },
  };
}

function generateCompanySchema(company: Company) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.company_name,
    description: company.description,
    url: company.website,
    logo: company.logo,
    address: company.city ? {
      "@type": "PostalAddress",
      addressLocality: company.city,
      addressCountry: company.country || "DE",
    } : undefined,
    contactPoint: company.contact_email ? {
      "@type": "ContactPoint",
      email: company.contact_email,
      telephone: company.contact_phone,
    } : undefined,
  };
}

export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [company, jobs] = await Promise.all([
    getCompany(id),
    getCompanyJobs(id),
  ]);

  if (!company) {
    notFound();
  }

  const activeJobs = jobs.filter(j => j.is_active);
  const jsonLd = generateCompanySchema(company);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CompanyProfileClient company={company} activeJobs={activeJobs} />
    </>
  );
}
