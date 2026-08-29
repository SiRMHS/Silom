import type { Metadata } from "next";
import BrandHeader from "@/components/BrandHeader";
import BottomNav from "@/components/BottomNav";
import MagazineIndex from "@/components/MagazineIndex";
import SiteFooter from "@/components/SiteFooter";
import { getFooterWords, getMagazineContent, pick } from "@rahyad/core";
import { pageMetadata, seoStrings } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const s = await seoStrings();
  return pageMetadata({
    path: "/magazine",
    title: pick(s, "seo.magazine.title", "مجله | رهیــــاد"),
    description: pick(s, "seo.magazine.description", "نوشته‌ها و یادداشت‌های تیم رهیاد"),
  });
}

export default async function MagazinePage() {
  const [{ strings, posts, dock }, footerWords] = await Promise.all([
    getMagazineContent(),
    getFooterWords(),
  ]);

  return (
    <main className="page-magazine">
      <div className="mag-shell">
        <header className="mag-head">
          <p className="mag-eyebrow">{pick(strings, "magazine.eyebrow", "مجله‌ی رهیاد")}</p>
          <h1 className="mag-title">
            {pick(strings, "magazine.title", "چیزهایی که یاد گرفته‌ایم")}
          </h1>
          <p className="mag-intro">
            {pick(
              strings,
              "magazine.intro",
              "یادداشت‌هایی درباره‌ی طراحی، برند و کارهایی که در راه ساختن‌شان چیزی فهمیدیم.",
            )}
          </p>
        </header>

        <MagazineIndex
          posts={posts}
          emptyText={pick(strings, "magazine.empty", "هنوز نوشته‌ای منتشر نشده. به‌زودی.")}
        />
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
