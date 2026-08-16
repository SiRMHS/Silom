"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icons";

export type NavCounts = Record<string, number | undefined>;

type NavLink = { href: string; label: string; icon: IconName; countKey?: string };

const GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: "کلی",
    links: [
      { href: "/admin", label: "داشبورد", icon: "dashboard" },
      { href: "/admin/settings", label: "متن‌های سایت", icon: "text", countKey: "settings" },
    ],
  },
  {
    title: "صفحه‌ی اصلی",
    links: [
      { href: "/admin/headlines", label: "تیترهای متحرک", icon: "headline", countKey: "headlines" },
      { href: "/admin/stats", label: "آمار", icon: "stats", countKey: "stats" },
      { href: "/admin/services", label: "خدمات", icon: "services", countKey: "services" },
      { href: "/admin/team", label: "تیم", icon: "team", countKey: "team" },
      {
        href: "/admin/testimonials",
        label: "حرف مشتری‌ها",
        icon: "testimonials",
        countKey: "testimonials",
      },
      { href: "/admin/partners", label: "همکاران", icon: "partners", countKey: "partners" },
    ],
  },
  {
    title: "پروژه‌ها",
    links: [
      {
        href: "/admin/projects",
        label: "پروژه‌ها و مطالعات موردی",
        icon: "projects",
        countKey: "projects",
      },
    ],
  },
  {
    title: "مجله",
    links: [
      { href: "/admin/posts", label: "نوشته‌ها", icon: "posts", countKey: "posts" },
      { href: "/admin/comments", label: "نظرها", icon: "comments", countKey: "comments" },
    ],
  },
  {
    title: "ناوبری",
    links: [
      { href: "/admin/navigation", label: "منوها", icon: "navigation", countKey: "nav" },
      { href: "/admin/boot", label: "کلمات بوت", icon: "boot", countKey: "boot" },
    ],
  },
  {
    title: "دیگر",
    links: [
      { href: "/admin/media", label: "کتابخانه‌ی رسانه", icon: "media", countKey: "media" },
      { href: "/admin/messages", label: "پیام‌ها", icon: "messages", countKey: "messages" },
      { href: "/admin/users", label: "کاربران", icon: "users", countKey: "users" },
    ],
  },
];

export default function Sidebar({ counts }: { counts: NavCounts }) {
  const pathname = usePathname();

  return (
    <nav className="ad-nav" aria-label="بخش‌های پنل">
      {GROUPS.map((group) => (
        <div className="ad-nav-section" key={group.title}>
          <div className="ad-nav-group">{group.title}</div>
          {group.links.map((link) => {
            // /admin must not light up for every child route
            const active =
              link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
            const count = link.countKey ? counts[link.countKey] : undefined;
            return (
              <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined}>
                <Icon name={link.icon} />
                <span>{link.label}</span>
                {count !== undefined && (
                  <span className="ad-nav-count">{count.toLocaleString("fa-IR")}</span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
