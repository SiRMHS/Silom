"use server";

import { revalidatePath } from "next/cache";
import { db } from "@rahyad/db";
import { requireAdmin } from "@/lib/auth";

export async function markMessageRead(id: string, isRead: boolean) {
  await requireAdmin();
  await db.contactMessage.update({ where: { id }, data: { isRead } });
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function deleteMessage(id: string) {
  await requireAdmin();
  await db.contactMessage.delete({ where: { id } });
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
  return { ok: true as const };
}
