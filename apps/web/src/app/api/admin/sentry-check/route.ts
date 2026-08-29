import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * Throws on purpose, to confirm errors actually reach Bugsink.
 *
 * Worth keeping rather than deleting after the first check: the reporting
 * chain has several links that can break quietly — a rebuilt image without
 * NEXT_PUBLIC_SENTRY_DSN, an expired cert on errors.rahyad.com, the collector
 * being down — and all of them fail the same way, by silence. Silence is
 * indistinguishable from "no errors happened", so the only way to know
 * reporting still works is to cause one.
 *
 * Admin-gated, and answers 404 rather than 403 to anyone else so it does not
 * advertise itself as a way to generate noise.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") {
    return new NextResponse("Not Found", { status: 404 });
  }

  throw new Error(
    `Bugsink connectivity check — deliberate error, triggered by ${user.email} at ${new Date().toISOString()}`,
  );
}
