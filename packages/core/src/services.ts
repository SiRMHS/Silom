import "server-only";

import { db } from "@rahyad/db";
import { toFaqs, type Faq } from "./faq";
import {
  projectSelect,
  toSections,
  toSiteProject,
  type Section,
  type SiteProject,
} from "./content";

/**
 * Services, read the same way the rest of the site is read.
 *
 * One `Service` row is three things: a row in the home page's accordion, a card
 * on the /services hub, and the landing page that card opens. The hub only ever
 * needs the card's worth of columns, so it takes them and leaves the sections,
 * gallery and film on the landing page's own query.
 *
 * The projects shown on a landing page are not stored on the service: they are
 * looked up through the `ProjectService` join in project order, so a case study
 * filed under a service appears there the moment it is filed, and disappears
 * when it is hidden.
 */

const IMAGE = { select: { url: true, alt: true } } as const;

/** Enough of a service to draw its card — the hub and the related rails. */
export type ServiceCard = {
  id: string;
  slug: string;
  index: string;
  title: string;
  body: string;
  tags: string[];
  accent: string;
  image: string | null;
  imageAlt: string;
  /** The clip the hub plays behind this service, when one has been uploaded. */
  film: ServiceFilm | null;
  /** Visible case studies filed under this service. */
  projectCount: number;
};

export type ServiceFilm = { url: string; type: string; poster: string | null };

export type SiteService = ServiceCard & {
  headline: string;
  excerpt: string;
  sections: Section[];
  faqs: Faq[];
  ctaTitle: string;
  ctaNote: string;
  gallery: { url: string; alt: string; width: number | null; height: number | null }[];
  projects: SiteProject[];
};

const cardColumns = {
  id: true,
  slug: true,
  indexLabel: true,
  title: true,
  body: true,
  tags: true,
  accent: true,
  image: IMAGE,
  film: { select: { url: true, mimeType: true } },
} as const;

type CardRow = {
  id: string;
  slug: string;
  indexLabel: string;
  title: string;
  body: string;
  tags: string[];
  accent: string;
  image: { url: string; alt: string } | null;
  film: { url: string; mimeType: string } | null;
};

const toCard = (s: CardRow, projectCount: number): ServiceCard => ({
  id: s.id,
  slug: s.slug,
  index: s.indexLabel,
  title: s.title,
  body: s.body,
  tags: s.tags,
  accent: s.accent,
  image: s.image?.url ?? null,
  imageAlt: s.image?.alt ?? "",
  // The hero still doubles as the film's poster frame, so a clip never opens
  // on a black rectangle while it buffers.
  film: s.film ? { url: s.film.url, type: s.film.mimeType, poster: s.image?.url ?? null } : null,
  projectCount,
});

/**
 * How many visible case studies each service has, keyed by service id.
 *
 * Counted in one grouped query rather than per card: the hub draws every
 * service, and a count each would be a query each.
 */
async function projectCounts(): Promise<Map<string, number>> {
  const rows = await db.projectService.groupBy({
    by: ["serviceId"],
    where: { project: { visible: true } },
    _count: { projectId: true },
  });
  return new Map(rows.map((r) => [r.serviceId, r._count.projectId]));
}

/** Every visible service as a card, in panel order. */
export async function getServiceCards(): Promise<ServiceCard[]> {
  const [rows, counts] = await Promise.all([
    db.service.findMany({
      where: { visible: true },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      select: cardColumns,
    }),
    projectCounts(),
  ]);

  return rows.map((s) => toCard(s, counts.get(s.id) ?? 0));
}

/** The /services hub: its copy, the cards, and the bottom dock. */
export async function getServicesContent() {
  const [settings, cards, dock] = await Promise.all([
    db.setting.findMany({ select: { key: true, value: true } }),
    getServiceCards(),
    db.dockLink.findMany({ where: { visible: true }, orderBy: [{ order: "asc" }, { id: "asc" }] }),
  ]);

  return {
    strings: Object.fromEntries(settings.map((r) => [r.key, r.value])) as Record<string, string>,
    services: cards,
    dock: dock.map((x) => ({
      id: x.id,
      label: x.label,
      href: x.href,
      txLabel: x.txLabel,
      txColor: x.txColor,
    })),
  };
}

export type ServicesContent = Awaited<ReturnType<typeof getServicesContent>>;

/** Slugs of every visible service — for generateStaticParams and link lists. */
export async function getServiceSlugs(): Promise<string[]> {
  const rows = await db.service.findMany({
    where: { visible: true },
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

/**
 * One landing page, or null when the slug is unknown or the service is hidden.
 *
 * The related projects are a second query rather than a nested include: they
 * come back in the same shape every other project list on the site uses, so the
 * cards on a service page and the cards on the home page are literally the same
 * component reading the same fields.
 */
export async function getServiceBySlug(slug: string): Promise<SiteService | null> {
  const row = await db.service.findUnique({
    where: { slug },
    include: {
      image: IMAGE,
      film: { select: { url: true, mimeType: true } },
      gallery: {
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: { media: { select: { url: true, alt: true, width: true, height: true } } },
      },
    },
  });
  if (!row || !row.visible) return null;

  const projects = await db.project.findMany({
    where: { visible: true, services: { some: { serviceId: row.id } } },
    ...projectSelect,
  });

  return {
    ...toCard(row, projects.length),
    headline: row.headline,
    excerpt: row.excerpt,
    sections: toSections(row.sections),
    faqs: toFaqs(row.faqs),
    ctaTitle: row.ctaTitle,
    ctaNote: row.ctaNote,
    // `film` arrives on the card, so it is not spelled out again here.
    gallery: row.gallery.map((g) => ({
      url: g.media.url,
      alt: g.media.alt,
      width: g.media.width,
      height: g.media.height,
    })),
    projects: projects.map(toSiteProject),
  };
}
