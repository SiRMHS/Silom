import "server-only";

import { cache } from "react";
import type { Metadata } from "next";
import { getStrings, pick, type SiteStrings } from "@rahyad/core";

/**
 * One place for everything search engines and social cards read.
 *
 * The values live in the `SEO` group of the settings table, so the domain,
 * the share image and the site name are editable in the admin panel rather
 * than compiled in — and because the content snapshot is imported before
 * `next build` prerenders the pages, an edited value reaches the live `<head>`
 * through the same push that carries the rest of the content.
 */

/**
 * Every route's metadata reads the settings map, and several read it twice
 * (once in `generateMetadata`, once in the page). `cache` collapses that to a
 * single query per request.
 */
export const seoStrings = cache(getStrings);

/** Used only until the panel has a real domain in `seo.site.url`. */
const FALLBACK_ORIGIN = "https://rahyad.com";

/**
 * The public origin, with no trailing slash.
 *
 * `NEXT_PUBLIC_SITE_URL` wins so a preview or a staging host can point
 * canonicals at itself without touching the database; otherwise the panel's
 * value is used. A malformed value falls back rather than throwing — a bad
 * setting should cost a canonical tag, not the whole build.
 */
export function originFrom(s: SiteStrings): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || pick(s, "seo.site.url", FALLBACK_ORIGIN);
  try {
    return new URL(raw).origin;
  } catch {
    return FALLBACK_ORIGIN;
  }
}

export async function siteOrigin(): Promise<string> {
  return originFrom(await seoStrings());
}

/** Absolute URL for `path`, which social crawlers require — they do not resolve relative ones. */
export function absolute(origin: string, path: string): string {
  return new URL(path, `${origin}/`).toString();
}

/**
 * Whether the site may be indexed at all.
 *
 * A single switch in the panel, so the site can go up behind a domain before
 * it is meant to be found. Anything other than an explicit "0" indexes — the
 * safe default for a live site is to be findable.
 */
export function indexable(s: SiteStrings): boolean {
  return pick(s, "seo.robots.indexable", "1") !== "0";
}

/**
 * The site's default share card — `app/opengraph-image.png`, or whatever
 * `seo.og.image` points at instead.
 *
 * Named explicitly rather than left to the file convention. Next attaches
 * `app/opengraph-image.png` on its own only while a segment leaves `openGraph`
 * alone, and every page here sets it (for the title and canonical URL), which
 * drops the inherited image along with the rest of the parent's object. Pages
 * with no artwork of their own would otherwise share with no image at all.
 */
function ogImage(s: SiteStrings, origin: string) {
  const custom = pick(s, "seo.og.image", "");
  return [
    {
      url: absolute(origin, custom || "/opengraph-image.png"),
      width: 1200,
      height: 630,
      alt: pick(s, "seo.site.name", "رهیــــاد"),
    },
  ];
}

/**
 * Metadata shared by every route, applied once in the root layout.
 *
 * `metadataBase` is the important one: without it Next cannot turn the
 * relative image and canonical paths the pages use into the absolute URLs
 * Open Graph requires, and every share card silently loses its image.
 */
export async function rootMetadata(): Promise<Metadata> {
  const s = await seoStrings();
  const origin = originFrom(s);
  const name = pick(s, "seo.site.name", "رهیــــاد");
  const title = pick(s, "seo.home.title", "رهیــــاد | آژانس خلاقیت");
  const description = pick(
    s,
    "seo.home.description",
    "آژانس خلاقیت رهیاد — طراحی و هنر دیجیتال",
  );
  const keywords = pick(s, "seo.keywords", "")
    .split(/[,،]/)
    .map((k) => k.trim())
    .filter(Boolean);
  const google = pick(s, "seo.verification.google", "");
  const canIndex = indexable(s);

  return {
    metadataBase: new URL(origin),
    // A plain string, not a `{ default, template }` pair: the per-page titles in
    // the SEO settings are written complete, brand included, so a template here
    // would append the studio name to them a second time.
    title,
    description,
    applicationName: name,
    keywords: keywords.length ? keywords : undefined,
    // No `alternates` here on purpose. A canonical set on the root layout is
    // inherited by every route and resolves to the same URL for all of them,
    // which tells a crawler the whole site is one page duplicated. Each route
    // declares its own — see `pageMetadata` below.
    openGraph: {
      type: "website",
      siteName: name,
      locale: "fa_IR",
      url: origin,
      title,
      description,
      images: ogImage(s, origin),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: toUrls(ogImage(s, origin)),
    },
    // The panel's switch, plus the crawler-specific hints that decide how a
    // result is *rendered* once indexed — a full-size preview image and an
    // untruncated snippet, rather than Google's conservative defaults.
    robots: canIndex
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : { index: false, follow: false },
    verification: google ? { google } : undefined,
    formatDetection: { telephone: false },
  };
}

type OpenGraph = NonNullable<Metadata["openGraph"]>;

/**
 * Metadata for one public route.
 *
 * Worth going through rather than writing a `Metadata` object per page, because
 * of how Next merges: a segment that sets `openGraph` at all **replaces the
 * parent's entire object** rather than merging into it. A page that set only a
 * title there would quietly lose the site name, the locale and the share image
 * the root layout established. Everything shared is therefore rebuilt here on
 * every route, and `openGraph` takes only the fields that genuinely differ.
 *
 * `path` is what makes the page canonical — the root layout deliberately sets
 * no canonical of its own, since an inherited one would name every URL on the
 * site a duplicate of the home page.
 */
export async function pageMetadata(input: {
  /** Route path, leading slash, relative to `metadataBase`. */
  path: string;
  title: string;
  description?: string;
  /** Only what differs from the site default — type, images, publishedTime. */
  openGraph?: OpenGraph;
}): Promise<Metadata> {
  const s = await seoStrings();
  const origin = originFrom(s);
  const { path, title, description, openGraph } = input;

  // A page with its own artwork uses it; everything else falls back to the card.
  const images = openGraph?.images ?? ogImage(s, origin);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: pick(s, "seo.site.name", "رهیــــاد"),
      locale: "fa_IR",
      url: path,
      title,
      description,
      ...openGraph,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      // Cards take bare URLs, and an image may have arrived as an object.
      images: toUrls(images),
    },
  };
}

/** Whatever shape `images` came in as, reduced to the URL strings a card needs. */
function toUrls(images: OpenGraph["images"]): string[] | undefined {
  if (!images) return undefined;
  const list = Array.isArray(images) ? images : [images];
  return list
    .map((i) => (typeof i === "string" ? i : i instanceof URL ? i.toString() : String(i.url)))
    .filter(Boolean);
}

/**
 * The studio itself, as structured data.
 *
 * Rendered once on the home page. This is what lets a search result show the
 * brand as an entity — name, logo, contact — instead of a bare blue link.
 */
export function organizationJsonLd(s: SiteStrings, origin: string) {
  const name = pick(s, "seo.site.name", "رهیــــاد");
  // The same profile links the /contact page lists. `sameAs` is how a search
  // engine ties those accounts to this organisation rather than treating each
  // as an unrelated page.
  const sameAs = [
    "contact.social.instagram",
    "contact.social.linkedin",
    "contact.social.behance",
  ]
    .map((k) => pick(s, k, ""))
    // A bare "https://instagram.com/" is the seed placeholder, not a profile;
    // claiming it as the studio's account is worse than claiming nothing.
    .filter((v) => {
      try {
        return v.startsWith("http") && new URL(v).pathname.length > 1;
      } catch {
        return false;
      }
    });

  return {
    "@context": "https://schema.org",
    "@type": pick(s, "seo.organization.type", "Organization"),
    name,
    url: origin,
    logo: absolute(origin, "/assets/images/logo.svg"),
    image: absolute(origin, "/opengraph-image.png"),
    description: pick(s, "seo.home.description", ""),
    email: pick(s, "contact.email", "") || undefined,
    telephone: pick(s, "contact.phone", "") || undefined,
    address: pick(s, "contact.address", "")
      ? {
          "@type": "PostalAddress",
          streetAddress: pick(s, "contact.address", ""),
          addressCountry: "IR",
        }
      : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };
}
