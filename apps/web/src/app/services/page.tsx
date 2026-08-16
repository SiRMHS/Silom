import type { Metadata } from "next";
import ServicesReel from "@/components/ServicesReel";
import BrandHeader from "@/components/BrandHeader";
import BottomNav from "@/components/BottomNav";
import { getServicesContent, getStrings, pick } from "@rahyad/core";

/**
 * The services hub — the pillar the individual service pages cluster around.
 *
 * Every service here is one row of the accordion on the home page, and it opens
 * that row's own landing page. The home section is the summary; this is the
 * index; /services/<slug> is the whole thing. Nothing on this page is written
 * twice: it is the same table read at a different depth.
 *
 * The index is shown rather than listed — one service at a time, the full
 * window, looping — because what is being indexed is work, and work is looked
 * at before it is read. The paragraph a list would have printed sits on the
 * landing page, one click away, where someone who has already chosen a service
 * actually wants it.
 */

export async function generateMetadata(): Promise<Metadata> {
  const s = await getStrings();
  return {
    title: pick(s, "seo.services.title", "خدمات | رهیــــاد"),
    description: pick(
      s,
      "seo.services.description",
      "خدمات آژانس خلاقیت رهیاد — از هویت برند و طراحی وب تا تولید محتوا و استراتژی رشد.",
    ),
  };
}

export default async function ServicesPage() {
  const { strings: t, services, dock } = await getServicesContent();

  return (
    <main className="page-services-reel">
      {/* The reel's slides carry the names, so the page's own heading is here
          for the outline and the crawler rather than for the eye. */}
      <h1 className="reel-sr">{pick(t, "services.page.title", "خدماتی که ارائه می‌دهیم")}</h1>

      {services.length === 0 ? (
        <p className="reel-empty">{pick(t, "services.page.empty", "هنوز خدمتی منتشر نشده است.")}</p>
      ) : (
        <ServicesReel
          services={services}
          openLabel={pick(t, "services.page.cardCta", "دیدن خدمت")}
          cueLabel={pick(t, "services.page.cue", "بچرخانید")}
        />
      )}

      <BrandHeader align="corner" />
      <BottomNav items={dock} />
    </main>
  );
}
