import { db } from "@rahyad/db";
import MessageList from "@/components/admin/MessageList";

const dateFa = (d: Date) =>
  new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(d);

export default async function Page() {
  const rows = await db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <MessageList
      messages={rows.map((m) => ({
        id: m.id,
        name: m.name,
        contact: m.contact,
        phone: m.phone,
        subject: m.subject,
        message: m.message,
        referrer: m.referrer,
        services: m.services,
        budget: m.budget,
        timeline: m.timeline,
        source: m.source,
        isRead: m.isRead,
        // formatted on the server so the list doesn't hydrate a different date
        createdAt: dateFa(m.createdAt),
      }))}
    />
  );
}
