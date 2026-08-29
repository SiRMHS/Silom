import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import TxLink from "@/components/TxLink";
import ProjectHero from "@/components/ProjectHero";
import CaseGallery from "@/components/CaseGallery";
import BottomNav from "@/components/BottomNav";
import BrandHeader from "@/components/BrandHeader";
import FaqSection from "@/components/FaqSection";
import SiteFooter from "@/components/SiteFooter";
import {
  getAllProjects,
  getDockLinks,
  getFooterWords,
  getProjectBySlug,
  getStrings,
  pick,
  type SiteProject,
} from "@rahyad/core";
import { pageMetadata } from "@/lib/seo";

export async function generateStaticParams() {
  const projects = await getAllProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProjectBySlug(slug);
  if (!p) return { title: "پروژه | رهیــــاد" };

  return pageMetadata({
    path: `/projects/${p.slug}`,
    title: `${p.title} | رهیــــاد`,
    description: p.summary,
    openGraph: {
      // `article` rather than `website`: a case study is a dated piece of work
      // by the studio, and that is what the preview should say it is.
      type: "article",
      // The hero the page itself opens on. A project with none falls through to
      // the site card rather than sharing a blank frame.
      images: p.image ? [{ url: p.image, alt: p.imageAlt || p.title }] : undefined,
    },
  });
}

const faIndex = (i: number) => (i + 1).toLocaleString("fa-IR").padStart(2, "۰");

/**
 * The clip uploaded in the panel, muted and looping. A project without one
 * renders nothing here rather than an empty frame — the same arrangement a
 * service landing page uses.
 *
 * The hero image doubles as the poster, so the clip never opens on black while
 * it buffers.
 */
function CaseFilm({ project }: { project: SiteProject }) {
  if (!project.film) return null;

  return (
    <figure className="case-video" style={{ ["--c" as string]: project.color }}>
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster={project.film.poster ?? undefined}
        aria-label={`ویدیوی ${project.title}`}
      >
        <source src={project.film.url} type={project.film.type} />
      </video>
      <figcaption>ویدیوی معرفی — {project.title}</figcaption>
    </figure>
  );
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [p, all, dock, strings, footerWords] = await Promise.all([
    getProjectBySlug(slug),
    getAllProjects(),
    getDockLinks(),
    getStrings(),
    getFooterWords(),
  ]);
  if (!p) notFound();

  const idx = all.findIndex((x) => x.slug === slug);
  const next = all[(idx + 1) % all.length] ?? p;

  // The pair of frames between the copy takes the first two shots of the
  // gallery, and the strip below takes what is left — a picture is shown once
  // on the page, not twice. It only claims them when there is a second section
  // to break and two shots to spare; otherwise the pair keeps its tinted plates
  // and the whole gallery stays in the strip.
  const pairShots = p.sections.length > 1 && p.gallery.length >= 2 ? p.gallery.slice(0, 2) : [];
  const stripShots = p.gallery.slice(pairShots.length);

  return (
    <main className="page-case">
      <TxLink href="/projects" label="پروژه‌ها" className="case-back">
        <span aria-hidden="true">←</span> همه‌ی پروژه‌ها
      </TxLink>

      <ProjectHero
        color={p.color}
        cat={p.cat}
        title={p.title}
        image={p.image}
        imageAlt={p.imageAlt}
      />

      <div className="case-body">
        <section className="case-intro shell">
          <p className="case-summary">{p.summary}</p>

          <dl className="case-facts">
            <div>
              <dt>کارفرما</dt>
              <dd>{p.client}</dd>
            </div>
            <div>
              <dt>نقش ما</dt>
              <dd>{p.role}</dd>
            </div>
            <div>
              <dt>سال</dt>
              <dd>{p.year}</dd>
            </div>
            <div>
              <dt>حوزه</dt>
              <dd>{p.tags.join("، ")}</dd>
            </div>
          </dl>

          {/* Which services this project is an example of — the way back up
              from a case study to the thing you would order. */}
          {p.services.length > 0 && (
            <div className="case-services">
              <span className="case-services-label">خدمات این پروژه</span>
              <ul className="case-services-list">
                {p.services.map((s) => (
                  <li key={s.slug} style={{ ["--c" as string]: s.accent }}>
                    <TxLink
                      href={`/services/${s.slug}`}
                      label={s.title}
                      accent={s.accent}
                      className="case-service-chip"
                    >
                      {s.title}
                      <span aria-hidden="true">←</span>
                    </TxLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Text and media alternate so the case study reads as a story rather
            than a wall of copy followed by a dump of pictures. The breaks are
            keyed to position, so a project with two sections or six still gets
            the rhythm instead of an index-out-of-range. */}
        {p.sections.map((s, i) => (
          <div key={i}>
            <section className="case-block shell">
              <h2 className="case-h">
                <span className="case-num">{faIndex(i)}</span>
                {s.h}
              </h2>
              {/* Rich text from the panel. Sanitised on save — see
                  lib/admin/sanitize.ts — never rendered raw from the client. */}
              <div
                className="case-p case-rich"
                dangerouslySetInnerHTML={{ __html: s.p }}
              />
            </section>

            {i === 0 && <CaseFilm project={p} />}

            {i === 1 && (
              <section className="case-pair shell" aria-label="تصاویر">
                {pairShots.length > 0
                  ? pairShots.map((shot) => (
                      <figure className="case-plate" key={shot.url}>
                        <Image
                          src={shot.url}
                          alt={shot.alt}
                          width={shot.width ?? 1200}
                          height={shot.height ?? 900}
                          sizes="(max-width: 700px) 88vw, 44vw"
                          // The optimizer refuses SVG unless the whole app opts
                          // in; a vector needs no resizing anyway.
                          unoptimized={shot.url.toLowerCase().endsWith(".svg")}
                        />
                      </figure>
                    ))
                  : [0, 1].map((n) => (
                      <span key={n} className="case-plate" style={{ ["--c" as string]: p.color }} />
                    ))}
              </section>
            )}
          </div>
        ))}

        {/* A project can have a film before it has a word written; with no
            section to break, it plays on its own above the gallery. */}
        {p.sections.length === 0 && <CaseFilm project={p} />}

        {/* Nothing left for the strip once the pair took the gallery — but a
            project with no pictures at all keeps the strip's own plates, so the
            page still has the section. */}
        {(stripShots.length > 0 || p.gallery.length === 0) && (
          <CaseGallery color={p.color} shots={stripShots} />
        )}

        <FaqSection faqs={p.faqs} className="shell" />

        <TxLink className="case-next" href={`/projects/${next.slug}`} label={next.title}>
          <span className="case-next-label">پروژه‌ی بعدی</span>
          <span className="case-next-title">{next.title}</span>
          <span className="case-next-art" style={{ ["--c" as string]: next.color }} />
        </TxLink>
      </div>

      <SiteFooter words={footerWords} strings={strings} />

      <BrandHeader
        align="corner"
        ctaLabel={pick(strings, "nav.cta.label", "در تماس باشیم")}
        ctaHref={pick(strings, "nav.cta.href", "/contact")}
      />
      <BottomNav items={dock} />
    </main>
  );
}
