import GalektoHome from "@/components/GalektoHome";
import PageSections from "@/components/PageSections";
import BootScreen from "@/components/BootScreen";
import BrandHeader from "@/components/BrandHeader";
import BottomNav from "@/components/BottomNav";

export default function Home() {
  return (
    <>
      <GalektoHome />
      <PageSections />
      <BootScreen />
      <BrandHeader />
      <BottomNav />
    </>
  );
}
