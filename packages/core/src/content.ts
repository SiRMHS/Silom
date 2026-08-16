import "server-only";

import { db } from "@rahyad/db";
import { pick } from "./strings";
import { toFaqs, type Faq } from "./faq";

export { pick };

/**
 * Content the public site renders, read straight from the database.
 *
 * The pages are statically rendered; admin mutations call revalidatePath, so a
 * visitor gets a cached page and an edit shows up on the next request.
 *
 * Every read falls back to a literal via `pick`, so a deleted row degrades to a
 * plain page rather than a blank one.
 */

const IMAGE = { select: { url: true, alt: true } } as const;

// Team portraits may be a still, a GIF or a looping clip, so the card needs the
// type to know whether to render <img> or <video>.
const PORTRAIT = { select: { url: true, alt: true, mimeType: true } } as const;

export type Section = { h: string; p: string };

/**
 * One team member, in the shape every place that shows people renders.
 *
 * The home page's strip uses the name, role and portrait; the /contact roster
 * additionally shows `bio` and `focus`; the /team table shows `location`.
 * Reading the whole row for all three keeps a single mapper — a team member is
 * a handful of short columns, not a payload worth splitting in three.
 */
export type SiteTeamMember = {
  id: string;
  name: string;
  role: string;
  monogram: string;
  bio: string;
  location: string;
  focus: string[];
  accent: string;
  image: string | null;
  imageAlt: string;
  isVideo: boolean;
};

type TeamRow = {
  id: string;
  name: string;
  role: string;
  monogram: string;
  bio: string;
  location: string;
  focus: string[];
  accent: string;
  image: { url: string; alt: string; mimeType: string } | null;
};

const toTeamMember = (x: TeamRow): SiteTeamMember => ({
  id: x.id,
  name: x.name,
  role: x.role,
  monogram: x.monogram,
  bio: x.bio,
  location: x.location,
  focus: x.focus,
  accent: x.accent,
  image: x.image?.url ?? null,
  imageAlt: x.image?.alt ?? "",
  isVideo: x.image?.mimeType.startsWith("video/") ?? false,
});

const teamQuery = {
  where: { visible: true },
  orderBy: [{ order: "asc" as const }, { id: "asc" as const }],
  include: { image: PORTRAIT },
};

/** One slide of the testimonial slider: the quote and who said it. */
export type SiteTestimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
  image: string | null;
  imageAlt: string;
  /** First letter of the name — what a slide with no portrait shows instead. */
  initial: string;
};

/** A service, as a project links to it: enough to draw a chip. */
export type ProjectService = { slug: string; title: string; accent: string };

export type SiteProject = {
  id: string;
  slug: string;
  title: string;
  cat: string;
  year: string;
  tags: string[];
  color: string;
  client: string;
  role: string;
  summary: string;
  sections: Section[];
  faqs: Faq[];
  c: number;
  r: number;
  w: number;
  h: number;
  image: string | null;
  imageAlt: string;
  /** The clip the case study plays, when one has been uploaded in the panel. */
  film: ProjectFilm | null;
  gallery: { url: string; alt: string; width: number | null; height: number | null }[];
  /** Which services this project is an example of — empty on list views. */
  services: ProjectService[];
};

export type ProjectFilm = { url: string; type: string; poster: string | null };

function stringsFrom(rows: { key: string; value: string }[]): Record<string, string> {
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** `sections` is Json in the database; anything malformed degrades to empty. */
export function toSections(value: unknown): Section[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((b) => ({ h: String((b as Section)?.h ?? ""), p: String((b as Section)?.p ?? "") }))
    .filter((b) => b.h || b.p);
}

/** A clip needs its type as well as its url, so <source> can be typed. */
const FILM = { select: { url: true, mimeType: true } } as const;

export const projectSelect = {
  orderBy: [{ order: "asc" as const }, { id: "asc" as const }],
  include: { image: IMAGE, film: FILM },
};

type ProjectRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  year: string;
  tags: string[];
  color: string;
  client: string;
  role: string;
  summary: string;
  sections: unknown;
  faqs?: unknown;
  col: number;
  row: number;
  w: number;
  h: number;
  image: { url: string; alt: string } | null;
  film?: { url: string; mimeType: string } | null;
  // Only the case-study page asks for the gallery; list views leave it off
  // rather than pulling a join per tile.
  gallery?: { media: { url: string; alt: string; width: number | null; height: number | null } }[];
  // Likewise the service links — a canvas tile has nowhere to show them.
  services?: { service: { slug: string; title: string; accent: string; visible: boolean } }[];
};

const GALLERY = {
  orderBy: [{ order: "asc" as const }, { id: "asc" as const }],
  select: { media: { select: { url: true, alt: true, width: true, height: true } } },
};

/** The services a case study is filed under, in the order the panel set. */
export const PROJECT_SERVICES = {
  orderBy: [{ order: "asc" as const }, { serviceId: "asc" as const }],
  select: { service: { select: { slug: true, title: true, accent: true, visible: true } } },
};

// `cat`/`c`/`r` rather than the column names: the canvas and case-study
// components were written against that shape.
export const toSiteProject = (p: ProjectRow): SiteProject => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  cat: p.category,
  year: p.year,
  tags: p.tags,
  color: p.color,
  client: p.client,
  role: p.role,
  summary: p.summary,
  sections: toSections(p.sections),
  faqs: toFaqs(p.faqs),
  c: p.col,
  r: p.row,
  w: p.w,
  h: p.h,
  image: p.image?.url ?? null,
  imageAlt: p.image?.alt ?? "",
  // The hero doubles as the film's poster frame, so the clip never opens on a
  // black rectangle while it buffers — same arrangement as a service page.
  film: p.film ? { url: p.film.url, type: p.film.mimeType, poster: p.image?.url ?? null } : null,
  gallery: (p.gallery ?? []).map((g) => ({
    url: g.media.url,
    alt: g.media.alt,
    width: g.media.width,
    height: g.media.height,
  })),
  // A hidden service has no page to open, so its chip is dropped rather than
  // linked into a 404.
  services: (p.services ?? [])
    .filter((s) => s.service.visible)
    .map((s) => ({ slug: s.service.slug, title: s.service.title, accent: s.service.accent })),
});

export async function getHomeContent() {
  const [settings, headlines, stats, services, team, partners, projects, dock, rail, bootWords] =
    await Promise.all([
      db.setting.findMany({ select: { key: true, value: true } }),
      db.headlineWord.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] }),
      db.stat.findMany({ where: { visible: true }, orderBy: [{ order: "asc" }, { id: "asc" }] }),
      db.service.findMany({ where: { visible: true }, orderBy: [{ order: "asc" }, { id: "asc" }] }),
      db.teamMember.findMany(teamQuery),
      db.partner.findMany({
        where: { visible: true },
        orderBy: [{ order: "asc" }, { id: "asc" }],
        include: { image: IMAGE },
      }),
      db.project.findMany({ where: { visible: true }, ...projectSelect }),
      db.dockLink.findMany({ where: { visible: true }, orderBy: [{ order: "asc" }, { id: "asc" }] }),
      db.railLink.findMany({ where: { visible: true }, orderBy: [{ order: "asc" }, { id: "asc" }] }),
      db.bootWord.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] }),
    ]);

  const s = stringsFrom(settings);
  const featuredCount = Math.max(0, Number(pick(s, "work.featuredCount", "3")) || 0);

  return {
    strings: s,

    manifestoWords: headlines
      .filter((w) => w.group === "MANIFESTO")
      .map((w) => ({ text: w.text, emphasis: w.emphasis as string })),
    footerWords: headlines
      .filter((w) => w.group === "FOOTER")
      .map((w) => ({ text: w.text, emphasis: w.emphasis as string })),

    stats: stats.map((x) => ({
      id: x.id,
      value: x.value,
      suffix: x.suffix,
      label: x.label,
      accent: x.accent,
    })),

    // `slug` so an open accordion row can offer the full landing page — the
    // home section is the summary of /services/<slug>, not a separate thing.
    services: services.map((x) => ({
      id: x.id,
      slug: x.slug,
      index: x.indexLabel,
      title: x.title,
      body: x.body,
      tags: x.tags,
      accent: x.accent,
    })),

    // The featured strip is the head of the project list, so a card and the
    // page it opens are the same row.
    work: projects.slice(0, featuredCount).map(toSiteProject),

    team: team.map(toTeamMember),

    partners: partners.map((x) => ({
      id: x.id,
      name: x.name,
      src: x.image?.url ?? null,
      weight: x.weight,
      spacing: x.spacing,
      italic: x.italic,
    })),

    dock: dock.map((x) => ({
      id: x.id,
      label: x.label,
      href: x.href,
      txLabel: x.txLabel,
      txColor: x.txColor,
    })),

    rail: rail.map((x) => ({
      id: x.id,
      label: x.label,
      caption: x.caption,
      index: x.indexLabel,
      href: x.href,
      side: x.side === "END" ? ("end" as const) : ("start" as const),
      accent: x.accent,
    })),

    // The boot sequence always ends on the brand word, which lives in settings
    // so it can change without reordering the list.
    bootWords: [...bootWords.map((w) => w.text), pick(s, "boot.finalWord", "رهیاد")],
  };
}

export type HomeContent = Awaited<ReturnType<typeof getHomeContent>>;

export async function getProjectsContent() {
  const [settings, projects, dock] = await Promise.all([
    db.setting.findMany({ select: { key: true, value: true } }),
    db.project.findMany({ where: { visible: true }, ...projectSelect }),
    db.dockLink.findMany({ where: { visible: true }, orderBy: [{ order: "asc" }, { id: "asc" }] }),
  ]);

  return {
    strings: stringsFrom(settings),
    projects: projects.map(toSiteProject),
    dock: dock.map((x) => ({
      id: x.id,
      label: x.label,
      href: x.href,
      txLabel: x.txLabel,
      txColor: x.txColor,
    })),
  };
}

export type ProjectsContent = Awaited<ReturnType<typeof getProjectsContent>>;

/**
 * The contact page: the form's copy and the studio's own details.
 *
 * The roster used to repeat here — the same `TeamMember` table the home page's
 * strip reads — but the people now have their own page at /team, so this one
 * stays about getting in touch rather than about who answers.
 */
export async function getContactContent() {
  const [settings, dock] = await Promise.all([
    db.setting.findMany({ select: { key: true, value: true } }),
    db.dockLink.findMany({ where: { visible: true }, orderBy: [{ order: "asc" }, { id: "asc" }] }),
  ]);

  return {
    strings: stringsFrom(settings),
    dock: dock.map((x) => ({
      id: x.id,
      label: x.label,
      href: x.href,
      txLabel: x.txLabel,
      txColor: x.txColor,
    })),
  };
}

export type ContactContent = Awaited<ReturnType<typeof getContactContent>>;

/**
 * The /team page: the studio described through the four lists it already keeps.
 *
 * Nothing on the page is a new table. The clients are the `Partner` rows the
 * home page runs as a marquee, shown here as a static grid because a page about
 * who we are should let a visitor read the list rather than wait for it. The
 * capabilities are the `Service` rows and their tags — the same services the
 * accordion opens, flattened to the headings and the work under each. The
 * counters are `Stat`, and the roster is `TeamMember`.
 *
 * So the page is maintained by editing the collections that were already being
 * edited: add a partner and it appears here, add a tag to a service and it
 * joins that column.
 */
export async function getTeamContent() {
  const [settings, team, testimonials, partners, services, stats, headlines, dock] =
    await Promise.all([
      db.setting.findMany({ select: { key: true, value: true } }),
      db.teamMember.findMany(teamQuery),
      db.testimonial.findMany({
        where: { visible: true },
        orderBy: [{ order: "asc" }, { id: "asc" }],
        include: { image: IMAGE },
      }),
      db.partner.findMany({
        where: { visible: true },
        orderBy: [{ order: "asc" }, { id: "asc" }],
        include: { image: IMAGE },
      }),
      db.service.findMany({
        where: { visible: true },
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: { id: true, slug: true, title: true, tags: true, accent: true },
      }),
      db.stat.findMany({ where: { visible: true }, orderBy: [{ order: "asc" }, { id: "asc" }] }),
      db.headlineWord.findMany({
        where: { group: "FOOTER" },
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: { text: true, emphasis: true },
      }),
      db.dockLink.findMany({
        where: { visible: true },
        orderBy: [{ order: "asc" }, { id: "asc" }],
      }),
    ]);

  return {
    strings: stringsFrom(settings),
    team: team.map(toTeamMember),

    // A quote with nothing in it is a blank slide the reader has to click past,
    // so an empty `quote` drops the row rather than the slider showing it.
    testimonials: testimonials
      .filter((x) => x.quote.trim())
      .map(
        (x): SiteTestimonial => ({
          id: x.id,
          quote: x.quote,
          name: x.name,
          role: x.role,
          image: x.image?.url ?? null,
          imageAlt: x.image?.alt ?? "",
          initial: x.name.trim().charAt(0) || "«",
        }),
      ),

    partners: partners.map((x) => ({
      id: x.id,
      name: x.name,
      src: x.image?.url ?? null,
      weight: x.weight,
      spacing: x.spacing,
      italic: x.italic,
    })),

    // A service with no tags has no list under its heading, so it is left out
    // rather than printed as a lone title in an otherwise full column.
    capabilities: services
      .filter((x) => x.tags.length > 0)
      .map((x) => ({ id: x.id, slug: x.slug, title: x.title, items: x.tags, accent: x.accent })),

    stats: stats.map((x) => ({
      id: x.id,
      value: x.value,
      suffix: x.suffix,
      label: x.label,
      accent: x.accent,
    })),

    footerWords: headlines.map((w) => ({ text: w.text, emphasis: w.emphasis as string })),

    dock: dock.map((x) => ({
      id: x.id,
      label: x.label,
      href: x.href,
      txLabel: x.txLabel,
      txColor: x.txColor,
    })),
  };
}

export type TeamContent = Awaited<ReturnType<typeof getTeamContent>>;

/** All visible projects in canvas order — for slug pages and static params. */
export async function getAllProjects(): Promise<SiteProject[]> {
  const rows = await db.project.findMany({ where: { visible: true }, ...projectSelect });
  return rows.map(toSiteProject);
}

export async function getProjectBySlug(slug: string): Promise<SiteProject | null> {
  const row = await db.project.findUnique({
    where: { slug },
    include: { image: IMAGE, film: FILM, gallery: GALLERY, services: PROJECT_SERVICES },
  });
  return row && row.visible ? toSiteProject(row) : null;
}

/** Just the key/value strings — for metadata and small standalone reads. */
export async function getStrings(): Promise<Record<string, string>> {
  return stringsFrom(await db.setting.findMany({ select: { key: true, value: true } }));
}

/**
 * The words of the closing headline, for the footer every page ends on.
 *
 * Read on its own rather than through `getHomeContent`, because the pages that
 * need it need nothing else from the home page — and it is the same row set the
 * home page reads, so the sentence is written once in the panel.
 */
export async function getFooterWords() {
  const rows = await db.headlineWord.findMany({
    where: { group: "FOOTER" },
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: { text: true, emphasis: true },
  });
  return rows.map((w) => ({ text: w.text, emphasis: w.emphasis as string }));
}

/** Dock links alone, for pages that only render the bottom navigation. */
export async function getDockLinks() {
  const dock = await db.dockLink.findMany({
    where: { visible: true },
    orderBy: [{ order: "asc" }, { id: "asc" }],
  });
  return dock.map((x) => ({
    id: x.id,
    label: x.label,
    href: x.href,
    txLabel: x.txLabel,
    txColor: x.txColor,
  }));
}
