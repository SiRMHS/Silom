/**
 * Replays `content-snapshot.json` into the database `DATABASE_URL` points at.
 *
 *   npm run db:import
 *
 * This is a seeding tool, not a deploy step. It is for bringing a database that
 * has no content of its own up to the committed snapshot: a fresh local
 * Postgres, or a throwaway one a CI build prerenders against.
 *
 * It is deliberately NOT part of the deploy on Coolify, where the build talks
 * to the production database — see the `builder` stage in the Dockerfile. The
 * server is the source of truth for content; `db:export` is how it comes back
 * into git.
 *
 * The snapshot is the source of truth for the tables it covers: a row missing
 * from it is deleted, so content removed on a laptop is removed live too. It
 * never touches accounts, sessions, reader comments or contact messages —
 * those are written on the server and a laptop's copy would destroy them.
 *
 * Anything edited through the live admin panel *is* in scope and will be
 * destroyed by an import. Run `db:export` first if the database you are
 * pointing at holds edits worth keeping.
 */

import { config as loadEnv } from "dotenv";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { CONTENT_MODELS, type ContentModel, type Snapshot, rowId, rowKey } from "./content-models";

loadEnv({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const SNAPSHOT = fileURLToPath(new URL("../content-snapshot.json", import.meta.url));

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

type Stale = { model: ContentModel; row: Record<string, unknown> };

type Table = {
  findMany: (a: unknown) => Promise<Record<string, unknown>[]>;
  upsert: (a: unknown) => Promise<unknown>;
  delete: (a: unknown) => Promise<unknown>;
};

async function main() {
  const raw = await readFile(SNAPSHOT, "utf8").catch(() => null);
  if (raw === null) {
    console.log(`بدون اسنپ‌شات (${SNAPSHOT}) — کاری انجام نشد.`);
    return;
  }

  const snapshot = JSON.parse(raw) as Snapshot;
  if (snapshot.version !== 1) {
    throw new Error(`نسخه‌ی ناشناخته‌ی اسنپ‌شات: ${snapshot.version}`);
  }
  console.log(`اسنپ‌شات ${snapshot.exportedAt} (migration: ${snapshot.migration ?? "—"})`);

  const stale: Stale[] = [];

  // Writing, parents first.
  for (const model of CONTENT_MODELS) {
    const rows = snapshot.rows[model] ?? [];
    const table = tableFor(model);

    for (const row of rows) {
      await table.upsert({ where: rowKey(model, row), create: row, update: row });
    }

    // Deleting, so a row dropped locally is dropped here too. Compared by key
    // rather than by count: an edit that swaps one row for another leaves the
    // count unchanged.
    const wanted = new Set(rows.map((r) => rowId(model, r)));
    const present = await table.findMany({ select: selectKey(model) });
    const extra = present.filter((r) => !wanted.has(rowId(model, r)));

    console.log(`  ${model}: ${rows.length} نوشته شد${extra.length ? `، ${extra.length} حذف` : ""}`);
    stale.push(...extra.map((row) => ({ model, row })));
  }

  // Children first on the way out, mirroring the write order, so a delete never
  // trips a foreign key that the next delete would have cleared.
  for (const { model, row } of stale.reverse()) {
    await tableFor(model).delete({ where: rowKey(model, row) });
  }

  console.log("تمام شد.");
}

const tableFor = (model: ContentModel) =>
  (db as unknown as Record<ContentModel, Table>)[model];

/** The key columns alone — enough to diff with, without reading whole rows. */
function selectKey(model: ContentModel) {
  return model === "projectService"
    ? { projectId: true, serviceId: true }
    : { id: true };
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
