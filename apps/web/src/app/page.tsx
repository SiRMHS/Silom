import type { Metadata } from "next";
import GalektoHome from "@/components/GalektoHome";
import PageSections from "@/components/PageSections";
import BootScreen from "@/components/BootScreen";
import BrandHeader from "@/components/BrandHeader";
import BottomNav from "@/components/BottomNav";
import { getHomeContent, pick } from "@rahyad/core";
import { organizationJsonLd, originFrom, pageMetadata, seoStrings } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const s = await seoStrings();
  return pageMetadata({
    path: "/",
    title: pick(s, "seo.home.title", "رهیــــاد | آژانس خلاقیت"),
    description: pick(s, "seo.home.description", "آژانس خلاقیت رهیاد — طراحی و هنر دیجیتال"),
  });
}

export default async function Home() {
  // Read once here and hand down, rather than querying from several
  // components: one round trip, and the page still renders statically until an
  // admin edit revalidates it.
  const content = await getHomeContent();

  // The home page is the site's entry in a search index, and its visible text
  // is a boot animation and a video — nothing a crawler can read the studio's
  // name, address or profiles out of. This states them outright.
  const org = organizationJsonLd(content.strings, originFrom(content.strings));

  return (
    <>
      <script
        type="application/ld+json"
        // Not user input: every value is a settings row rendered by the panel,
        // and JSON.stringify escapes what ends up between the script tags.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }}
      />
      <GalektoHome rail={content.rail} />
      <PageSections content={content} />
      <BootScreen />
      <BrandHeader ctaLabel="" />
      <BottomNav items={content.dock} />
    </>
  );
}
