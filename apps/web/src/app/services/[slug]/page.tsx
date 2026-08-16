import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TxLink from "@/components/TxLink";
import ServiceHero from "@/components/ServiceHero";
import ServiceJumpNav from "@/components/ServiceJumpNav";
import ServiceWork from "@/components/ServiceWork";
import CaseGallery from "@/components/CaseGallery";
import FaqSection from "@/components/FaqSection";
import ContactPageForm from "@/components/ContactPageForm";
import BrandHeader from "@/components/BrandHeader";
import BottomNav from "@/components/BottomNav";
import SiteFooter from "@/components/SiteFooter";
import {
  getDockLinks,
  getFooterWords,
  getServiceBySlug,
  getServiceCards,
  getServiceSlugs,
  getStrings,
  pick,
} from "@rahyad/core";

/**
 * One service, at full length.
 *
 * The page is the same document every time — what it is, how it is done, what
 * it looks like, what it has been used for, what people ask, and a form to
 * order it — and every part of it is a column in the panel. A service with no
 * film, no gallery or no case studies simply skips those sections instead of
 * drawing empty ones, so a half-written service still reads as a finished page.
 *
 * The order form is the /contact page's form, not a copy of it: same component,
 * same server action, same inbox. It only arrives with the subject already
 * filled in with the service's name.
 */

export async function generateStaticParams() {
  const slugs = await getServiceSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = await getServiceBySlug(slug);
  if (!s) return { title: "خدمات | رهیــــاد" };
  return {
    title: `${s.title} | رهیــــاد`,
    description: s.excerpt || s.body,
  };
}

const faIndex = (i: number) => (i + 1).toLocaleString("fa-IR").padStart(2, "۰");

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [service, cards, dock, t, footerWords] = await Promise.all([
    getServiceBySlug(slug),
    getServiceCards(),
    getDockLinks(),
    getStrings(),
    getFooterWords(),
  ]);
  if (!service) notFound();

  const others = cards.filter((c) => c.slug !== service.slug);

  // Structured data for the service itself. The FAQ block emits its own
  // FAQPage; both are built from the same rows the page renders, so neither can
  // describe something the visitor cannot see.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.excerpt || service.body,
    serviceType: service.tags,
    provider: {
      "@type": "Organization",
      name: pick(t, "brand.name", "رهیاد"),
    },
  };

  return (
    <main className="page-service" style={{ ["--c" as string]: service.accent }}>
      <ServiceHero
        accent={service.accent}
        index={service.index}
        title={service.headline || service.title}
        excerpt={service.excerpt || service.body}
        tags={service.tags}
        image={service.image}
        imageAlt={service.imageAlt}
      />

      {/* Sticky index of the page. Plain anchors — the browser's own smooth
          scrolling and back button do the work, and it still works with the
          JavaScript off. */}
      <ServiceJumpNav aria-label="بخش‌های این صفحه">
        <div className="sv-jump-inner shell">
          <div className="sv-jump-links">
            <TxLink href="/services" label="خدمات" className="sv-jump-back">
              {pick(t, "services.jump.back", "همه‌ی خدمات")}
            </TxLink>

            {service.sections.length > 0 && (
              <a href="#about">{pick(t, "services.jump.about", "توضیحات")}</a>
            )}
            {service.gallery.length > 0 && (
              <a href="#gallery">{pick(t, "services.jump.gallery", "گالری")}</a>
            )}
            {service.projects.length > 0 && (
              <a href="#work">{pick(t, "services.jump.work", "نمونه‌کارها")}</a>
            )}
            {service.faqs.length > 0 && (
              <a href="#faq">{pick(t, "services.jump.faq", "سوالات")}</a>
            )}
          </div>

          <a href="#order" className="sv-jump-cta">
            {pick(t, "services.jump.order", "ثبت سفارش")}
          </a>
        </div>
      </ServiceJumpNav>

      <div className="sv-body">
        {service.sections.length > 0 && (
          <div id="about">
            {service.sections.map((s, i) => (
              <section className="sv-section shell" key={i}>
                <h2 className="sv-h">
                  <span className="sv-num">{faIndex(i)}</span>
                  {s.h}
                </h2>
                {/* Rich text from the panel. Sanitised on save — see
                    admin/sanitize.ts — never rendered raw from the client. */}
                <div className="sv-p case-rich" dangerouslySetInnerHTML={{ __html: s.p }} />
              </section>
            ))}
          </div>
        )}

        {service.film && (
          <figure className="sv-film" id="film">
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              poster={service.film.poster ?? undefined}
              aria-label={`ویدیوی ${service.title}`}
            >
              <source src={service.film.url} type={service.film.type} />
            </video>
            <figcaption>
              {pick(t, "services.filmCaption", "ویدیوی معرفی")} — {service.title}
            </figcaption>
          </figure>
        )}

        {service.gallery.length > 0 && (
          <div id="gallery">
            <CaseGallery color={service.accent} shots={service.gallery} />
          </div>
        )}

        <ServiceWork
          projects={service.projects}
          accent={service.accent}
          title={pick(t, "services.work.title", "نمونه‌کارهای این خدمت")}
          note={pick(
            t,
            "services.work.note",
            "پروژه‌هایی که همین خدمت را گرفته‌اند — هر کارت، صفحه‌ی کامل خودش را باز می‌کند.",
          )}
          emptyText={pick(
            t,
            "services.work.empty",
            "هنوز پروژه‌ای از این خدمت منتشر نشده است. اولینش می‌تواند مال شما باشد.",
          )}
        />

        {service.faqs.length > 0 && (
          <div id="faq">
            <FaqSection faqs={service.faqs} className="shell" />
          </div>
        )}

        <section className="sv-order" id="order" aria-labelledby="sv-order-heading">
          <div className="sv-order-head shell">
            <h2 className="sv-h" id="sv-order-heading">
              {pick(t, "services.order.heading", "سفارش این خدمت")}
            </h2>
          </div>

          <div className="sv-order-form shell">
            <ContactPageForm
              strings={t}
              services={cards.map((c) => c.title)}
              preselect={service.title}
              title={service.ctaTitle || `${service.title} می‌خواهید؟`}
              note={
                service.ctaNote ||
                pick(
                  t,
                  "services.order.note",
                  "فرم را پر کنید؛ هرچه درباره‌ی کارتان بنویسید، جواب اول‌مان دقیق‌تر خواهد بود.",
                )
              }
              subject={`${pick(t, "services.order.subjectPrefix", "سفارش")}: ${service.title}`}
            />
          </div>
        </section>

        {others.length > 0 && (
          <section className="sv-others shell" aria-labelledby="sv-others-heading">
            <h2 className="sv-h" id="sv-others-heading">
              {pick(t, "services.others.title", "خدمات دیگر")}
            </h2>

            <ul className="sv-others-list">
              {others.map((o) => (
                <li key={o.id} style={{ ["--c" as string]: o.accent }}>
                  <TxLink
                    href={`/services/${o.slug}`}
                    label={o.title}
                    accent={o.accent}
                    className="sv-others-link"
                  >
                    <span className="sv-others-num" aria-hidden="true">
                      {o.index}
                    </span>
                    <span className="sv-others-title">{o.title}</span>
                    <span className="sv-others-arrow" aria-hidden="true">
                      ←
                    </span>
                  </TxLink>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <SiteFooter words={footerWords} strings={t} />

      <script
        type="application/ld+json"
        // Serialised, not interpolated: the copy is editor input, and a stray
        // </script> in it would otherwise close this tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      {/* The same fixed chrome as every other inner page: the wordmark parked
          in the start corner and the dock at the foot. The jump bar reserves
          room for the mark so the two never sit on top of each other.

          No action in the chrome here: the jump bar carries its own — «ثبت
          سفارش», pointing at this page's form — and both would be pinned to
          the same end of the same top edge, one on top of the other. */}
      <BrandHeader align="corner" ctaLabel="" />
      <BottomNav items={dock} />
    </main>
  );
}
