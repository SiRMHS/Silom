import { db } from "@rahyad/db";
import { requireAdmin } from "@/lib/auth";
import UserManager from "@/components/admin/UserManager";

const dateFa = (d: Date) =>
  new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(d);

export default async function Page() {
  const me = await requireAdmin();
  const users = await db.user.findMany({ orderBy: [{ role: "asc" }, { createdAt: "asc" }] });

  return (
    <UserManager
      meId={me.id}
      users={users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt ? dateFa(u.lastLoginAt) : null,
      }))}
    />
  );
}
