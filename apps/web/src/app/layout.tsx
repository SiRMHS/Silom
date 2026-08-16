import type { Metadata } from "next";
import { peyda } from "@/lib/fonts/peyda";
import "./globals.css";

export const metadata: Metadata = {
  title: "رهیــــاد | آژانس خلاقیت",
  description: "آژانس خلاقیت رهیاد — طراحی و هنر دیجیتال",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={`${peyda.variable} antialiased`}>
      <body className={`${peyda.className} bg-black`}>
        {children}
      </body>
    </html>
  );
}
