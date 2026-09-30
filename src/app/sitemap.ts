import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { absoluteUrl } from "@/lib/site-url";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [{ url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 }];
  if (!process.env.SUPABASE_SECRET_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return pages;
  try {
    const { data, error } = await createAdminClient()
      .from("businesses")
      .select("slug, updated_at")
      .eq("active", true)
      .order("slug");
    if (error) return pages;
    for (const business of data ?? []) {
      pages.push({ url: absoluteUrl(`/${business.slug}`), lastModified: business.updated_at ?? undefined, changeFrequency: "weekly", priority: 0.6 });
    }
  } catch {
    // Sitemap remains valid if Supabase is temporarily unavailable.
  }
  return pages;
}
