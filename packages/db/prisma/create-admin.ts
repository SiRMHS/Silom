/**
 * Creates the first admin account on a database that has none.
 *
 *   npm run db:create-admin
 *
 * The server needs this because nothing else on the deploy path makes a user.
 * `prisma migrate deploy` only moves the schema, and `db:import` deliberately
 * skips accounts — a snapshot taken on a laptop must never overwrite the
 * accounts, sessions, comments and contact messages that only exist on the
 * server (see content-models.ts). Which leaves a freshly deployed site with a
 * login page and nothing that can log into it.
 *
 * With nothing set it creates the documented starting account, which is a
 * known password in a source file and therefore only safe for as long as it
 * takes to sign in once and change it — the panel's users page can edit both
 * the address and the password of your own account. ADMIN_EMAIL and
 * ADMIN_PASSWORD override it, and on a site that is already public that is the
 * better way in: the value never reaches the repository, and taking it from
 * the environment keeps it out of shell history and out of `ps` output.
 *
 * Safe to re-run: an existing account is reported and left alone. Changing a
 * forgotten password is a separate, deliberate act — pass ADMIN_RESET=1.
 */

import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Role } from "../src/generated/prisma/enums";
import { hashPassword } from "../src/password";

loadEnv({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/** The same floor the panel's own user form enforces, so the two agree. */
const MIN_LENGTH = 8;

/**
 * Starting credentials, matching the seed's — a fresh local database and a
 * fresh server get in the same way. Meant to be replaced from inside the panel
 * on first sign-in.
 */
const DEFAULT_EMAIL = "matthew@rahyad.ir";
const DEFAULT_PASSWORD = "matthew1234";
const DEFAULT_NAME = "Matthew";

async function main() {
  const email = (process.env.ADMIN_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
  const name = process.env.ADMIN_NAME || DEFAULT_NAME;
  const reset = process.env.ADMIN_RESET === "1";
  const isDefault = password === DEFAULT_PASSWORD;

  if (!email || !email.includes("@")) {
    throw new Error("ADMIN_EMAIL لازم است و باید یک ایمیل معتبر باشد.");
  }
  if (password.length < MIN_LENGTH) {
    throw new Error(`ADMIN_PASSWORD لازم است و باید حداقل ${MIN_LENGTH} کاراکتر باشد.`);
  }

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });

  if (existing && !reset) {
    console.log(`حساب ${email} از قبل وجود دارد — دست نخورد.`);
    console.log("برای عوض کردن رمز همین دستور را با ADMIN_RESET=1 اجرا کن.");
    return;
  }

  const passwordHash = await hashPassword(password);

  if (existing) {
    // Every existing session was signed against the old password; leaving them
    // alive would make a reset pointless for the case it exists for.
    const { count } = await db.session.deleteMany({ where: { userId: existing.id } });
    await db.user.update({
      where: { id: existing.id },
      data: { passwordHash, role: Role.ADMIN, isActive: true },
    });
    console.log(`رمز ${email} عوض شد؛ ${count} نشست فعال بسته شد.`);
    return;
  }

  await db.user.create({
    data: { email, name, passwordHash, role: Role.ADMIN, isActive: true },
  });
  console.log(`حساب مدیر ساخته شد → ${email}`);
  if (isDefault) {
    console.log(`رمز: ${DEFAULT_PASSWORD}`);
    console.warn(
      "\n⚠️  این رمز در مخزن نوشته شده و عمومی است. بعد از اولین ورود،\n" +
        "   از پنل → کاربران، ایمیل و رمز را عوض کن.",
    );
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
