import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BlogDetailClient from "./BlogDetailClient";

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
    const res = await fetch(`${API_URL}/blog/posts?category=${category}&limit=3`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const posts = await res.json();
    return posts.filter((p: BlogPost) => p.slug !== currentSlug).slice(0, 3);
  } catch {
    return [];
  }
}

// Alle Blog-Slugs für statische Generierung
export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/blog/posts`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const posts = await res.json();
    return (posts || []).map((post: { slug: string }) => ({
      slug: post.slug,
    }));
  } catch {
    return [];
  }
}

export const dynamicParams = true;
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) {
    return { title: "Artikel nicht gefunden" };
  }
  return {
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt || post.title,
    keywords: post.tags,
    alternates: {
      canonical: `https://www.jobon.work/blog/${post.slug}`,
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
      locale: "de_DE",
      url: `https://www.jobon.work/blog/${post.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt || post.title,
    },
  };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(post.category, slug);

  return <BlogDetailClient post={post} relatedPosts={relatedPosts} />;
}
