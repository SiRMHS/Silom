"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@rahyad/db";
import { createSession, destroySession, pruneExpiredSessions } from "@/lib/auth";
import { verifyPassword } from "@rahyad/db";

export type LoginState = { error?: string } | undefined;

/** Same message for "no such user" and "wrong password" — don't leak which. */
const BAD_CREDENTIALS = "ایمیل یا رمز عبور درست نیست";

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) {
    return { error: "ایمیل و رمز عبور را وارد کنید" };
  }

  const user = await db.user.findUnique({ where: { email } });

  // Run the hash comparison even when the user is missing, so a wrong email
  // doesn't answer measurably faster than a wrong password.
  const dummy = "scrypt$65536$8$1$00$00";
  const ok = await verifyPassword(password, user?.passwordHash ?? dummy);

  if (!user || !ok) return { error: BAD_CREDENTIALS };
  if (!user.isActive) return { error: "این حساب غیرفعال شده است" };
  if (user.role !== "ADMIN") return { error: "این حساب دسترسی به پنل مدیریت ندارد" };

  await pruneExpiredSessions();

  const ua = (await headers()).get("user-agent");
  await createSession(user.id, ua);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}
