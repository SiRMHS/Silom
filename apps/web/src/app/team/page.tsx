import type { Metadata } from "next";
import Link from "next/link";
import BrandHeader from "@/components/BrandHeader";
import BottomNav from "@/components/BottomNav";
import SiteFooter from "@/components/SiteFooter";
import TeamTable from "@/components/TeamTable";
import Testimonials from "@/components/Testimonials";
import { getTeamContent, pick } from "@rahyad/core";
import { pageMetadata, seoStrings } from "@/lib/seo";

/**
 * The studio, described by the lists it already keeps.
 *
 * /services says what we do and /projects shows it done; this page answers the
 * question those two leave open — who is behind them. It reads in the order
 * someone sizing up a studio asks in: who has trusted you, what can you
 * actually take on, how much of it have you done, and finally who are you.
 *
 * None of the four is a new table. The clients are the partner logos, the
 * capabilities are the services and their tags, the counters are the stats, and
 * the roster is the team — every one of them already editable in the panel, and
 * every one already shown somewhere else on the site. Adding a partner or
 * tagging a service updates this page as a side effect, which is the point: a
 * page about the studio that goes stale is worse than no page at all.
 *
 * Rendered on the server apart from the roster, which needs a pointer.
 */

export async function generateMetadata(): Promise<Metadata> {
  const s = await seoStrings();
  return pageMetadata({
    path: "/team",
    title: pick(s, "seo.team.title", "تیم ما | رهیــــاد"),
    description: pick(
      s,
      "seo.team.description",
      "استودیوی رهیاد — مشتریان، توانمندی‌ها و آدم‌هایی که کار را انجام می‌دهند.",
    ),
  });
}

/** ASCII digits → Persian, so a stat stored as 120 still reads fa. */
const faDigits = (s: string) => s.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

export default async function TeamPage() {
  const { strings: t, team, testimonials, partners, capabilities, stats, footerWords, dock } =
    await getTeamContent();

  const ctaHref = pick(t, "team.hub.ctaHref", "/contact");
  const ctaLabel = pick(t, "team.hub.ctaLabel", "برای‌مان بنویسید");

  return (
    <main className="page-team">
      <div className="contact-shell">
        <header className="mag-head">
          <p className="mag-eyebrow">{pick(t, "team.hub.eyebrow", "استودیو")}</p>
          <h1 className="mag-title">
            {pick(t, "team.hub.title", "راهبرد، طراحی و ساخت — زیر یک سقف")}
          </h1>
          <p className="mag-intro">
            {pick(
              t,
              "team.hub.intro",
              "استودیویی مستقل که روی ایده، سیستم و اجرا با هم کار می‌کند. آنچه پایین می‌آید همان چیزی است که تحویل می‌دهیم و همان کسانی که تحویلش می‌دهند.",
            )}
          </p>
        </header>
      </div>

      {/* ── مشتریان ─────────────────────────────────────────────
          The same partners the home page runs as a marquee. Here they are
          still: a marquee is an ornament for a page someone is scrolling
          through, and this is a page someone is reading a list on. */}
      {partners.length > 0 && (
        <section className="tblock tclients" aria-labelledby="tclients-title">
          <div className="contact-shell">
            <h2 className="tblock-title" id="tclients-title">
              {pick(t, "team.hub.clientsTitle", "مشتریان منتخب")}
            </h2>

            <ul className="tclients-grid">
              {partners.map((p) => (
                <li className="tclients-cell" key={p.id}>
                  {p.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.src} alt={p.name} loading="lazy" decoding="async" />
                  ) : (
                    <span
                      className="logo-wordmark"
                      style={{
                        fontWeight: p.weight,
                        letterSpacing: p.spacing,
                        fontStyle: p.italic ? "italic" : undefined,
                      }}
                    >
                      {p.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── توانمندی‌ها ─────────────────────────────────────────
          One column per service, its tags as the list underneath. The tags
          were already the short answer to "what does this service cover"; put
          side by side they become the studio's whole range on one screen. */}
      {capabilities.length > 0 && (
        <section className="tblock tcaps" aria-labelledby="tcaps-title">
          <div className="contact-shell">
            <h2 className="tblock-title" id="tcaps-title">
              {pick(t, "team.hub.capabilitiesTitle", "توانمندی‌ها")}
            </h2>

            <ul className="tcaps-grid">
              {capabilities.map((c) => (
                <li className="tcaps-group" key={c.id} style={{ ["--accent" as string]: c.accent }}>
                  {/* The heading links on: a visitor who recognises what they
                      need here should not have to find it again in the dock. */}
                  <h3 className="tcaps-heading">
                    <Link href={`/services/${c.slug}`}>{c.title}</Link>
                  </h3>
                  <ul className="tcaps-items">
                    {c.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── آمار ────────────────────────────────────────────────
          Set large and one per row, because four numbers read as a claim and
          four numbers in a tidy little strip read as decoration. */}
      {stats.length > 0 && (
        <section className="tblock tstats" aria-labelledby="tstats-title">
          <div className="contact-shell">
            <h2 className="tblock-title" id="tstats-title">
              {pick(t, "team.hub.statsTitle", "در یک نگاه")}
            </h2>

            <p className="tstats-note">
              {pick(
                t,
                "team.hub.statsNote",
                "هیچ‌کدام از این عددها یک‌شبه جمع نشده‌اند؛ هرکدام یک قدم است که با مسئله‌ی واقعی و آدم واقعی برداشته شده.",
              )}
            </p>

            <dl className="tstats-list">
              {stats.map((s) => (
                <div className="tstats-row" key={s.id} style={{ ["--accent" as string]: s.accent }}>
                  <dt className="tstats-label">{s.label}</dt>
                  <dd className="tstats-value">
                    {faDigits(String(s.value))}
                    {s.suffix && <span className="tstats-suffix">{s.suffix}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      <TeamTable
        team={team}
        label={pick(t, "team.hub.rosterTitle", "تیم ما")}
        columns={{
          name: pick(t, "team.hub.colName", "نام"),
          role: pick(t, "team.hub.colRole", "سمت"),
          location: pick(t, "team.hub.colLocation", "شهر"),
        }}
      />

      {/* ── همکاری ──────────────────────────────────────────────
          The roster ends on a closed list, which invites the obvious
          question. This answers it before the footer does. */}
      <section className="tblock tcta" aria-labelledby="tcta-title">
        <div className="contact-shell tcta-shell">
          <div>
            <p className="mag-eyebrow">{pick(t, "team.hub.ctaEyebrow", "همکاری")}</p>
            <h2 className="tcta-title" id="tcta-title">
              {pick(t, "team.hub.ctaTitle", "برای کار در سطح جهانی، آدم‌های سطح جهانی می‌خواهیم.")}
            </h2>
          </div>

          <div className="tcta-side">
            <p className="tcta-note">
              {pick(
                t,
                "team.hub.ctaNote",
                "هم عمومی‌کار می‌خواهیم هم متخصص، با پیشینه‌ها و نگاه‌های متفاوت. اگر جایگاهی که به شما بخورد اینجا نیست، باز هم بنویسید و بگویید چه چیزی به تیم اضافه می‌کنید.",
              )}
            </p>
            {ctaLabel && (
              <Link className="tcta-link" href={ctaHref}>
                {ctaLabel}
                <span aria-hidden="true">↗</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── حرف مشتری‌ها ────────────────────────────────────────
          Last, because it is the only section on the page written by someone
          other than us — a page that opens on our own claims should close on
          somebody else's. */}
      <Testimonials
        items={testimonials}
        title={pick(t, "team.hub.sayTitle", "حرف مشتری‌ها")}
        lead={pick(t, "team.hub.sayLead", "مشتری‌ها چه می‌گویند:")}
        prevLabel={pick(t, "team.hub.sayPrev", "قبلی")}
        nextLabel={pick(t, "team.hub.sayNext", "بعدی")}
      />

      <SiteFooter words={footerWords} strings={t} />

      <BrandHeader
        align="corner"
        ctaLabel={pick(t, "nav.cta.label", "در تماس باشیم")}
        ctaHref={pick(t, "nav.cta.href", "/contact")}
      />
      <BottomNav items={dock} />
    </main>
  );
}
