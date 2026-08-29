/**
 * Writes the editable content of the database to `content-snapshot.json`.
 *
 *   npm run db:export
 *
 * Commit the result. `db:import` replays it, and the Docker build runs that
 * import before `next build`, so pushing a snapshot is what carries locally
 * authored content into the prerendered pages of the live site.
 *
 * Images are not in here — they are files under `apps/web/public/uploads`,
 * already tracked by git, and the `Media` rows below only point at them. A
 * snapshot referencing an upload that was never committed will import cleanly
 * and then render a broken image, so the check at the end looks for that.
 */

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  CONTENT_MODELS,
  SERVER_OWNED_MODELS,
  STRIPPED_COLUMNS,
  type Snapshot,
} from "./content-models";

loadEnv({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

// Deliberately outside prisma/: the Dockerfile copies that whole directory in
// before `npm ci` (the schema is needed by `prisma generate` on postinstall),
// so a snapshot living there would invalidate the dependency layer and force a
// full reinstall on every content-only push.
const OUT = fileURLToPath(new URL("../content-snapshot.json", import.meta.url));
const UPLOADS = fileURLToPath(new URL("../../../apps/web/public/uploads/", import.meta.url));

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/** Every model the client exposes, so a new one can't quietly go unexported. */
function declaredModels(): string[] {
  return Object.keys(db).filter(
    (k) => !k.startsWith("$") && !k.startsWith("_") && typeof (db as never as Record<string, { findMany?: unknown }>)[k]?.findMany === "function",
  );
}

async function main() {
  const known = new Set<string>([...CONTENT_MODELS, ...SERVER_OWNED_MODELS]);
  const unclassified = declaredModels().filter((m) => !known.has(m));
  if (unclassified.length) {
    throw new Error(
      `مدل‌های طبقه‌بندی‌نشده در content-models.ts: ${unclassified.join(", ")}\n` +
        "هر مدل تازه باید یا به CONTENT_MODELS اضافه شود یا به SERVER_OWNED_MODELS.",
    );
  }

  // Which migration this content was authored against, so importing a stale
  // snapshot into a newer schema is at least visible in the diff.
  const applied = await db.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1
  `.catch(() => []);

  const rows: Snapshot["rows"] = {};
  for (const model of CONTENT_MODELS) {
    const table = db[model] as unknown as {
      findMany: (a: unknown) => Promise<Record<string, unknown>[]>;
    };
    // Ordered by key so the committed file only changes when content does —
    // an unordered dump rewrites itself on every run and buries the real diff.
    const found = await table.findMany({ orderBy: orderFor(model) });
    const strip = STRIPPED_COLUMNS[model] ?? [];
    rows[model] = strip.length
      ? found.map((row) => ({ ...row, ...Object.fromEntries(strip.map((f) => [f, null])) }))
      : found;
    console.log(`  ${model}: ${rows[model].length}`);
  }

  const snapshot: Snapshot = {
    version: 1,
    exportedAt: new Date().toISOString(),
    migration: applied[0]?.migration_name ?? null,
    rows,
  };

  await writeFile(OUT, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`\nنوشته شد → ${OUT}`);

  reportMissingUploads(rows.media ?? []);
}

/** Compound-keyed tables have no `id`; everything else sorts by it. */
function orderFor(model: (typeof CONTENT_MODELS)[number]) {
  if (model === "projectService") {
    return [{ projectId: "asc" }, { serviceId: "asc" }] as const;
  }
  return { id: "asc" } as const;
}

/**
 * A `Media` row points at a path under `public/uploads`; the file itself only
 * reaches the server if it was committed. Warn rather than fail — a snapshot
 * taken mid-edit is still worth writing, and the fix is a `git add`.
 */
function reportMissingUploads(media: Record<string, unknown>[]) {
  const missing = media
    .map((m) => String(m.url ?? ""))
    .filter((url) => url.startsWith("/uploads/"))
    .filter((url) => !existsSync(new URL(url.slice("/uploads/".length), `file://${UPLOADS}`)));

  if (!missing.length) return;
  console.warn(
    `\n⚠️  ${missing.length} فایل رسانه در public/uploads پیدا نشد؛ بدون commit کردنشان روی سایت لایو خراب نمایش داده می‌شوند:`,
  );
  for (const url of missing) console.warn(`   ${url}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
