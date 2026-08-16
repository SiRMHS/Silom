import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@rahyad/db";
import Sidebar from "@/components/admin/Sidebar";
import { Icon } from "@/components/admin/Icons";
import { logout } from "@/app/admin/auth-actions";

/**
 * The panel's real guard. proxy.ts only checks that a cookie exists; this is
 * where the session is actually resolved and the role enforced.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  const [
    settings,
    headlines,
    stats,
    services,
    team,
    testimonials,
    partners,
    projects,
    posts,
    comments,
    dock,
    rail,
    boot,
    media,
    messages,
    users,
  ] = await Promise.all([
    db.setting.count(),
    db.headlineWord.count(),
    db.stat.count(),
    db.service.count(),
    db.teamMember.count(),
    db.testimonial.count(),
    db.partner.count(),
    db.project.count(),
    db.post.count(),
    db.postComment.count({ where: { approved: false } }),
    db.dockLink.count(),
    db.railLink.count(),
    db.bootWord.count(),
    db.media.count(),
    db.contactMessage.count({ where: { isRead: false } }),
    db.user.count(),
  ]);

  return (
    <div className="ad-shell">
      <aside className="ad-sidebar">
        <div className="ad-brand">
          {/* the brand mark itself — plain <img> so the SVG ships as-is */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ad-brand-mark" src="/assets/images/logo.svg" alt="" width={30} height={30} />
          <span>
            <b>رهیاد</b>
            <span>پنل مدیریت</span>
          </span>
        </div>

        <Sidebar
          counts={{
            settings,
            headlines,
            stats,
            services,
            team,
            testimonials,
            partners,
            projects,
            posts,
            comments,
            nav: dock + rail,
            boot,
            media,
            messages,
            users,
          }}
        />

        <div className="ad-sidebar-foot">
          <div className="ad-who">
            <span className="ad-who-avatar" aria-hidden>
              {user.name.trim().charAt(0)}
            </span>
            <div>
              <b>{user.name}</b>
              <span>{user.email}</span>
            </div>
          </div>

          <div className="ad-sidebar-actions">
            <Link className="ad-btn ad-btn--sm ad-btn--ghost" href="/" target="_blank">
              <Icon name="external" size={14} />
              دیدن سایت
            </Link>
            <form action={logout}>
              <button className="ad-btn ad-btn--sm ad-btn--ghost" type="submit">
                <Icon name="logout" size={14} />
                خروج
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="ad-main">{children}</main>
    </div>
  );
}
