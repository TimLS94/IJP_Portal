import { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogDetailClient from "../../[slug]/BlogDetailClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ijp-portal.onrender.com/api/v1";

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  category: string;
  category_label: string;
  tags?: string;
  meta_title?: string;
  meta_description?: string;
  author_name?: string;
  published_at: string;
  view_count: number;
}

async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`${API_URL}/blog/posts/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getRelatedPosts(category: string, currentSlug: string): Promise<BlogPost[]> {
  try {
    const res = await fetch(`${API_URL}/blog/posts?category=${category}&language=es&limit=4`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const posts = await res.json();
    return posts.filter((p: BlogPost) => p.slug !== currentSlug).slice(0, 3);
  } catch {
    return [];
  }
}

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/blog/sitemap/urls`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const urls: { slug: string; language: string }[] = data.urls || [];
    return urls
      .filter((entry) => entry.language === "es")
      .map((entry) => ({ slug: entry.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) {
    return { title: "Artículo no encontrado" };
  }
  const pageUrl = `https://www.jobon.work/blog/es/${post.slug}`;
  return {
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt || post.title,
    keywords: post.tags,
    alternates: {
      canonical: pageUrl,
      languages: {
        "es": pageUrl,
        "de": `https://www.jobon.work/blog`,
      },
    },
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt || post.title,
      images: post.featured_image ? [{ url: post.featured_image, alt: post.title }] : [],
      type: "article",
      publishedTime: post.published_at,
      siteName: "JobOn",
      locale: "es_ES",
      url: pageUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt || post.title,
    },
  };
}

function generateArticleSchema(post: BlogPost) {
  const pageUrl = `https://www.jobon.work/blog/es/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.meta_title || post.title,
    description: post.meta_description || post.excerpt || post.title,
    url: pageUrl,
    datePublished: post.published_at,
    dateModified: post.published_at,
    author: {
      "@type": "Organization",
      name: post.author_name || "JobOn",
      url: "https://www.jobon.work",
    },
    publisher: {
      "@type": "Organization",
      name: "JobOn",
      url: "https://www.jobon.work",
      logo: {
        "@type": "ImageObject",
        url: "https://www.jobon.work/logo-512x512.png",
      },
    },
    image: post.featured_image
      ? { "@type": "ImageObject", url: post.featured_image }
      : { "@type": "ImageObject", url: "https://www.jobon.work/logo-512x512.png" },
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
    keywords: post.tags || undefined,
    inLanguage: "es-ES",
    isPartOf: {
      "@type": "WebSite",
      name: "JobOn",
      url: "https://www.jobon.work",
    },
  };
}

export default async function BlogDetailEsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(post.category, slug);
  const jsonLd = generateArticleSchema(post);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogDetailClient post={post} relatedPosts={relatedPosts} language="es" />
    </>
  );
}
