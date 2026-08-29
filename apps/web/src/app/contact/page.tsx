import type { Metadata } from "next";
import BrandHeader from "@/components/BrandHeader";
import BottomNav from "@/components/BottomNav";
import ContactPageForm from "@/components/ContactPageForm";
import SiteFooter from "@/components/SiteFooter";
import { getContactContent, getFooterWords, getServiceCards, pick } from "@rahyad/core";
import { pageMetadata, seoStrings } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const s = await seoStrings();
  return pageMetadata({
    path: "/contact",
    title: pick(s, "seo.contact.title", "تماس با ما | رهیــــاد"),
    description: pick(
      s,
      "seo.contact.description",
      "با تیم رهیاد در تماس باشید — فرم تماس، نشانی استودیو و معرفی اعضای تیم.",
    ),
  });
}

/** ASCII digits → Persian, so a number stored as 02191002233 still reads fa. */
const faDigits = (s: string) => s.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

/** Everything a tel: href can't carry — spaces, dashes, Persian digits. */
const telHref = (s: string) =>
  s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^\d+]/g, "");

const SOCIALS = [
  { key: "contact.social.instagram", label: "اینستاگرام" },
  { key: "contact.social.linkedin", label: "لینکدین" },
  { key: "contact.social.behance", label: "بی‌هنس" },
] as const;

export default async function ContactPage() {
  const [{ strings: t, dock }, footerWords, serviceCards] = await Promise.all([
    getContactContent(),
    getFooterWords(),
    // The brief asks which services are needed, and the answer list is the
    // studio's own — read from the same table /services is built from.
    getServiceCards(),
  ]);

  const email = pick(t, "contact.email");
  const phone = pick(t, "contact.phone");
  const address = pick(t, "contact.address");
  const hours = pick(t, "contact.hours");

  // A channel with nothing behind it is left out rather than printed empty —
  // an "ایمیل: —" row reads as a studio that lost its address.
  const socials = SOCIALS.map((s) => ({ ...s, href: pick(t, s.key) })).filter((s) => s.href);

  return (
    <main className="page-contact">
      <div className="contact-shell">
        <header className="mag-head">
          <p className="mag-eyebrow">{pick(t, "contact.page.eyebrow", "تماس با ما")}</p>
          <h1 className="mag-title">
            {pick(t, "contact.page.title", "بیایید درباره‌ی کارتان حرف بزنیم")}
          </h1>
          <p className="mag-intro">
            {pick(
              t,
              "contact.page.intro",
              "چه پروژه‌ی مشخصی داشته باشید و چه فقط ایده‌ای که هنوز شکل نگرفته، بنویسید. جواب هر پیام را خودمان می‌دهیم، نه یک پاسخ خودکار.",
            )}
          </p>
        </header>

        <div className="contact-layout">
          <ContactPageForm strings={t} services={serviceCards.map((s) => s.title)} />

          <aside className="cinfo" aria-labelledby="cinfo-heading">
            <h2 className="cinfo-heading" id="cinfo-heading">
              {pick(t, "contact.page.directTitle", "یا مستقیم")}
            </h2>

            <ul className="cinfo-list">
              {email && (
                <li className="cinfo-item">
                  <span className="cinfo-label">{pick(t, "contact.emailLabel", "ایمیل")}</span>
                  <a className="cinfo-value cinfo-link" href={`mailto:${email}`} dir="ltr">
                    {email}
                  </a>
                </li>
              )}

              {phone && (
                <li className="cinfo-item">
                  <span className="cinfo-label">{pick(t, "contact.phoneLabel", "تلفن")}</span>
                  {/* href keeps the dialable digits; the label keeps the Persian ones */}
                  <a className="cinfo-value cinfo-link" href={`tel:${telHref(phone)}`}>
                    {faDigits(phone)}
                  </a>
                </li>
              )}

              {address && (
                <li className="cinfo-item">
                  <span className="cinfo-label">{pick(t, "contact.addressLabel", "نشانی")}</span>
                  <p className="cinfo-value">{faDigits(address)}</p>
                </li>
              )}

              {hours && (
                <li className="cinfo-item">
                  <span className="cinfo-label">{pick(t, "contact.hoursLabel", "ساعت کاری")}</span>
                  <p className="cinfo-value">{faDigits(hours)}</p>
                </li>
              )}
            </ul>

            {socials.length > 0 && (
              <div className="cinfo-social">
                <span className="cinfo-label">{pick(t, "contact.socialLabel", "شبکه‌ها")}</span>
                <ul className="cinfo-social-list">
                  {socials.map((s) => (
                    <li key={s.key}>
                      <a
                        className="cinfo-social-link"
                        href={s.href}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {s.label}
                        <span aria-hidden="true">↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>

      <SiteFooter words={footerWords} strings={t} />

      {/* This page is the destination the action points at, so it drops it */}
      <BrandHeader align="corner" ctaLabel="" />
      <BottomNav items={dock} />
    </main>
  );
}
