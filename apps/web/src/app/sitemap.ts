import type { MetadataRoute } from "next";
import { getAllProjects, getPosts, getServiceSlugs } from "@rahyad/core";
import { seoStrings, indexable, originFrom } from "@/lib/seo";

/**
 * /sitemap.xml
 *
 * Built from the same queries the pages themselves use, so a project or post
 * hidden in the panel drops out of the sitemap in the same edit — a sitemap
 * listing URLs that 404 is worse than no sitemap.
 *
 * Like the pages, this is generated at build time and refreshed by the
 * `revalidatePath` calls the admin actions already make.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const s = await seoStrings();
  const origin = originFrom(s);

  // Nothing to advertise while the site is closed to crawlers.
  if (!indexable(s)) return [];

  const [projects, posts, services] = await Promise.all([
    getAllProjects(),
    getPosts(),
    getServiceSlugs(),
  ]);

  const at = (path: string) => `${origin}${path}`;

  // `priority` is only a hint about relative importance within this site, so
  // the landing pages outrank the archives, which outrank individual entries.
  const staticPages: MetadataRoute.Sitemap = [
    { url: at("/"), changeFrequency: "monthly", priority: 1 },
    { url: at("/projects"), changeFrequency: "weekly", priority: 0.9 },
    { url: at("/services"), changeFrequency: "monthly", priority: 0.9 },
    { url: at("/magazine"), changeFrequency: "weekly", priority: 0.8 },
    { url: at("/team"), changeFrequency: "monthly", priority: 0.6 },
    { url: at("/contact"), changeFrequency: "yearly", priority: 0.6 },
  ];

  return [
    ...staticPages,
    ...services.map((slug) => ({
      url: at(`/services/${slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...projects.map((p) => ({
      url: at(`/projects/${p.slug}`),
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
    ...posts.map((p) => ({
      url: at(`/magazine/${p.slug}`),
      // The one date the content actually carries. An invented `lastModified`
      // teaches a crawler nothing and costs trust when it turns out to be wrong.
      lastModified: p.publishedAt ? new Date(p.publishedAt) : undefined,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
