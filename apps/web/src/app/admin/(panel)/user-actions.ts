"use server";

import { revalidatePath } from "next/cache";
import { db } from "@rahyad/db";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@rahyad/db";
import type { Role } from "@rahyad/db";

export type UserFormState = { error?: string; ok?: string } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function createUser(_state: UserFormState, formData: FormData): Promise<UserFormState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "CLIENT") as Role;

  if (!EMAIL_RE.test(email)) return { error: "ایمیل معتبر نیست" };
  if (name.length < 2) return { error: "نام را کامل بنویسید" };
  if (password.length < 8) return { error: "رمز عبور دست‌کم ۸ نویسه باشد" };
  if (role !== "ADMIN" && role !== "CLIENT") return { error: "نقش نامعتبر است" };

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "کاربری با این ایمیل هست" };

  await db.user.create({ data: { email, name, passwordHash: await hashPassword(password), role } });

  revalidatePath("/admin/users");
  return { ok: `کاربر ${name} ساخته شد` };
}

export async function setUserActive(id: string, isActive: boolean) {
  const admin = await requireAdmin();
  if (id === admin.id) return { ok: false as const, error: "نمی‌توانید حساب خودتان را غیرفعال کنید" };

  await db.user.update({ where: { id }, data: { isActive } });
  // A disabled account should lose its open sessions immediately
  if (!isActive) await db.session.deleteMany({ where: { userId: id } });

  revalidatePath("/admin/users");
  return { ok: true as const };
}

export async function deleteUser(id: string) {
  const admin = await requireAdmin();
  if (id === admin.id) return { ok: false as const, error: "نمی‌توانید حساب خودتان را حذف کنید" };

  await db.user.delete({ where: { id } });
  revalidatePath("/admin/users");
  return { ok: true as const };
}

export async function resetPassword(id: string, password: string) {
  await requireAdmin();
  if (password.length < 8) return { ok: false as const, error: "رمز عبور دست‌کم ۸ نویسه باشد" };

  await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } });
  // Force every other device to sign in again with the new password
  await db.session.deleteMany({ where: { userId: id } });

  revalidatePath("/admin/users");
  return { ok: true as const };
}
