import GalektoHome from "@/components/GalektoHome";
import PageSections from "@/components/PageSections";
import BootScreen from "@/components/BootScreen";
import BrandHeader from "@/components/BrandHeader";
import BottomNav from "@/components/BottomNav";
import { getHomeContent } from "@rahyad/core";

export default async function Home() {
  // Read once here and hand down, rather than querying from several
  // components: one round trip, and the page still renders statically until an
  // admin edit revalidates it.
  const content = await getHomeContent();

  return (
    <>
      <GalektoHome rail={content.rail} />
      <PageSections content={content} />
      <BootScreen />
      <BrandHeader ctaLabel="" />
      <BottomNav items={content.dock} />
    </>
  );
}
