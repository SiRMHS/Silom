import type { Viewport } from "next";
import { peyda } from "@/lib/fonts/peyda";
import PageTransition from "@/components/PageTransition";
import { rootMetadata } from "@/lib/seo";
import "./globals.css";

// Site-wide title/description/Open Graph/robots, read from the SEO group of
// the settings table — see lib/seo.ts. Every route inherits this and overrides
// only what differs.
export const generateMetadata = rootMetadata;

export const viewport: Viewport = {
  // The page is a black canvas edge to edge; without this the mobile browser
  // chrome stays light and cuts a white band across the top of the design.
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={`${peyda.variable} antialiased`}>
      <body className={`${peyda.className} bg-black`}>
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
