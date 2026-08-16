import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: "پنل مدیریت | رهیاد",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  // data-admin-root is what admin.css keys its html/body overrides on
  return <div data-admin-root>{children}</div>;
}
