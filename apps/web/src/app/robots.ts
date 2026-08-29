import type { MetadataRoute } from "next";
import { seoStrings, indexable, originFrom } from "@/lib/seo";

/**
 * /robots.txt
 *
 * The admin panel and the upload endpoint are kept out of the index — not as a
 * security measure (they have their own auth) but because a login form ranking
 * for the studio's name is a bad search result.
 *
 * The whole site can be closed off from the panel with `seo.robots.indexable`,
 * for the window between the domain going live and the site being ready to be
 * found.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const s = await seoStrings();
  const origin = originFrom(s);

  if (!indexable(s)) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/api/"],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
