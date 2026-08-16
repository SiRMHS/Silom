import type { Metadata } from "next";
import ProjectsCanvas from "@/components/ProjectsCanvas";
import BrandHeader from "@/components/BrandHeader";
import BottomNav from "@/components/BottomNav";
import { getProjectsContent, getStrings, pick } from "@rahyad/core";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getStrings();
  return {
    title: pick(s, "seo.projects.title", "پروژه‌ها | رهیــــاد"),
    description: pick(s, "seo.projects.description", "پروژه‌های رهیاد"),
  };
}

export default async function ProjectsPage() {
  const { strings, projects, dock } = await getProjectsContent();

  return (
    <main className="page-projects">
      <ProjectsCanvas projects={projects} />
      <BrandHeader
        align="corner"
        ctaLabel={pick(strings, "nav.cta.label", "در تماس باشیم")}
        ctaHref={pick(strings, "nav.cta.href", "/contact")}
      />
      <BottomNav items={dock} />
    </main>
  );
}
