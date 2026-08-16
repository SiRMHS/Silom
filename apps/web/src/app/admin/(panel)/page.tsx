import Link from "next/link";
import { db } from "@rahyad/db";
import { requireAdmin } from "@/lib/auth";
import { Icon } from "@/components/admin/Icons";

const dateFa = (d: Date) =>
  new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(d);

export default async function DashboardPage() {
  const user = await requireAdmin();

  const [services, team, projects, partners, media, unread, recent] = await Promise.all([
    db.service.count(),
    db.teamMember.count(),
    db.project.count(),
    db.partner.count(),
    db.media.count(),
    db.contactMessage.count({ where: { isRead: false } }),
    db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const tiles = [
    { href: "/admin/services", label: "خدمات", count: services },
    { href: "/admin/projects", label: "پروژه‌ها", count: projects },
    { href: "/admin/team", label: "اعضای تیم", count: team },
    { href: "/admin/partners", label: "همکاران", count: partners },
    { href: "/admin/media", label: "تصاویر", count: media },
    { href: "/admin/messages", label: "پیام خوانده‌نشده", count: unread },
  ];

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>سلام {user.name.split(" ")[0]}</h1>
          <p>از این‌جا هر متن و هر آیتم سایت را می‌توانید عوض کنید. تغییرات بلافاصله روی سایت می‌نشیند.</p>
        </div>
        <div className="ad-head-actions">
          <Link className="ad-btn" href="/" target="_blank">
            <Icon name="external" size={14} />
            دیدن سایت
          </Link>
          <Link className="ad-btn ad-btn--primary" href="/admin/settings">
            ویرایش متن‌ها
          </Link>
        </div>
      </div>

      <div className="ad-tiles">
        {tiles.map((t) => (
          <Link className="ad-tile" href={t.href} key={t.href}>
            <b>{t.count.toLocaleString("fa-IR")}</b>
            <span>{t.label}</span>
          </Link>
        ))}
      </div>

      <div className="ad-card" style={{ marginTop: 24 }}>
        <h2>آخرین پیام‌ها</h2>
        <p>از فرم پایین صفحه‌ی اصلی و فرم صفحه‌ی «تماس با ما». متن کامل در بخش پیام‌ها.</p>

        {recent.length === 0 ? (
          <p className="ad-empty">هنوز پیامی نیامده است.</p>
        ) : (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>نام</th>
                  <th>تماس</th>
                  <th>زمان</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((m) => (
                  <tr key={m.id}>
                    {/* the footer form doesn't ask for a name */}
                    <td>{m.name || "—"}</td>
                    <td dir="ltr" style={{ textAlign: "right" }}>
                      {m.contact}
                    </td>
                    <td>{dateFa(m.createdAt)}</td>
                    <td>
                      {m.isRead ? (
                        <span className="ad-badge ad-badge--off">خوانده‌شده</span>
                      ) : (
                        <span className="ad-badge ad-badge--ok">تازه</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
