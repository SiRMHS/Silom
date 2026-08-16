import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

/**
 * Prisma 7 talks to Postgres through a driver adapter rather than its own
 * engine binary, so the connection string is handed to `pg` here.
 *
 * The instance is cached on globalThis because dev-mode HMR re-evaluates this
 * module on every edit, and a fresh client per reload exhausts the connection
 * pool within a few saves.
 */

const createClient = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — see .env.example");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
};

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
