import { Metadata } from "next";
import { Suspense } from "react";
import BlogListClient from "./BlogListClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ijp-portal.onrender.com/api/v1";

export const metadata: Metadata = {
  title: "Blog & Ratgeber - Tipps für Arbeit in Deutschland",
  description: "Tipps, News und hilfreiche Informationen rund um Arbeit in Deutschland, Karriere, Visa, Bewerbung und mehr. Alles was Sie für Ihren Start in Deutschland wissen müssen.",
  keywords: ["Blog", "Ratgeber", "Arbeit Deutschland", "Karriere Tipps", "Visa Deutschland", "Bewerbungstipps"],
  openGraph: {
    title: "Blog & Ratgeber | JobOn",
    description: "Tipps und Informationen rund um Arbeit in Deutschland.",
    type: "website",
    locale: "de_DE",
  },
};

interface Category {
  value: string;
  label: string;
}

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  category_label: string;
  featured_image?: string;
  published_at: string;
  view_count: number;
}

async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const res = await fetch(`${API_URL}/blog/posts?language=de`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_URL}/blog/categories`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.categories || [];
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const [posts, categories] = await Promise.all([
    getBlogPosts(),
    getCategories(),
  ]);

  return (
    <Suspense fallback={
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    }>
      <BlogListClient initialPosts={posts} categories={categories} />
    </Suspense>
  );
}
