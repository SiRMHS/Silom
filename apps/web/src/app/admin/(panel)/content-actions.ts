"use server";

import { revalidatePath } from "next/cache";
import { db } from "@rahyad/db";
import { requireAdmin } from "@/lib/auth";
import { COLLECTIONS, MODEL_KEYS, type FieldDef, type ModelKey } from "@rahyad/core/admin";

/**
 * One set of actions for every collection.
 *
 * Server Actions are reachable by direct POST, so `model` arriving from the
 * client is treated as untrusted input: it is checked against the known keys
 * before it can reach a Prisma delegate, and every action re-verifies the
 * admin session.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

/** The slice of a Prisma delegate these actions need, shared by all models. */
type Delegate = {
  create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
  delete(args: { where: { id: string } }): Promise<unknown>;
  findUnique(args: { where: { id: string } }): Promise<{ id: string; order: number } | null>;
  findMany(args?: unknown): Promise<{ id: string; order: number }[]>;
  aggregate(args: unknown): Promise<{ _max: { order: number | null } }>;
};

function delegateFor(model: ModelKey): Delegate {
  if (!MODEL_KEYS.includes(model)) throw new Error("unknown model");
  // Delegates differ in their argument types but agree on the shape used here.
  return (db as unknown as Record<ModelKey, Delegate>)[model];
}

const HEX = /^#[0-9a-fA-F]{3,8}$/;

function parseField(field: FieldDef, formData: FormData): unknown {
  const raw = formData.get(field.name);

  switch (field.type) {
    case "checkbox":
      // An unchecked box is simply absent from the payload
      return formData.has(field.name);

    case "number": {
      const n = Number(String(raw ?? "").trim());
      return Number.isFinite(n) ? Math.trunc(n) : 0;
    }

    case "tags":
      return String(raw ?? "")
        .split(/[,،]/)
        .map((t) => t.trim())
        .filter(Boolean);

    case "color": {
      const v = String(raw ?? "").trim();
      if (!v) return field.nullable ? null : "#000000";
      return HEX.test(v) ? v : "#000000";
    }

    case "image": {
      const v = String(raw ?? "").trim();
      return v || null;
    }

    case "select": {
      const v = String(raw ?? "").trim();
      const allowed = field.options?.some((o) => o.value === v);
      return allowed ? v : (field.options?.[0]?.value ?? "");
    }

    default: {
      const v = String(raw ?? "").trim();
      return !v && field.nullable ? null : v;
    }
  }
}

function dataFromForm(model: ModelKey, formData: FormData) {
  const data: Record<string, unknown> = {};
  for (const field of COLLECTIONS[model].fields) {
    data[field.name] = parseField(field, formData);
  }
  return data;
}

/** Public pages read straight from the database, so every edit busts them. */
function revalidateSite() {
  revalidatePath("/", "layout");
  revalidatePath("/projects");
}

export async function saveItem(model: ModelKey, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "شناسه‌ی ردیف پیدا نشد" };

  try {
    await delegateFor(model).update({ where: { id }, data: dataFromForm(model, formData) });
  } catch (e) {
    console.error("[admin] saveItem", model, e);
    return { ok: false, error: "ذخیره نشد" };
  }

  revalidateSite();
  return { ok: true };
}

export async function createItem(model: ModelKey): Promise<ActionResult> {
  await requireAdmin();
  const delegate = delegateFor(model);

  try {
    const max = await delegate.aggregate({ _max: { order: true } });
    await delegate.create({
      data: { ...COLLECTIONS[model].defaults, order: (max._max.order ?? -1) + 1 },
    });
  } catch (e) {
    console.error("[admin] createItem", model, e);
    return { ok: false, error: "ساخته نشد" };
  }

  revalidateSite();
  return { ok: true };
}

export async function deleteItem(model: ModelKey, id: string): Promise<ActionResult> {
  await requireAdmin();

  try {
    await delegateFor(model).delete({ where: { id } });
  } catch (e) {
    console.error("[admin] deleteItem", model, e);
    return { ok: false, error: "حذف نشد" };
  }

  revalidateSite();
  return { ok: true };
}

/**
 * Moves a row one step up or down by swapping `order` with its neighbour.
 * Swapping rather than renumbering keeps the write to two rows.
 */
export async function moveItem(
  model: ModelKey,
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  await requireAdmin();
  const delegate = delegateFor(model);

  try {
    const rows = await delegate.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] });
    const index = rows.findIndex((r) => r.id === id);
    if (index === -1) return { ok: false, error: "ردیف پیدا نشد" };

    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= rows.length) return { ok: true };

    // Neighbours can share an order value (e.g. after a bulk insert), so write
    // positions from the reordered array instead of trading the two numbers.
    // Written sequentially rather than in $transaction: the generic delegate
    // shape here isn't a PrismaPromise, and a half-applied renumber is only
    // ever a display-order glitch that the next move corrects.
    const reordered = [...rows];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    for (const [i, row] of reordered.entries()) {
      await delegate.update({ where: { id: row.id }, data: { order: i } });
    }
  } catch (e) {
    console.error("[admin] moveItem", model, e);
    return { ok: false, error: "جابه‌جا نشد" };
  }

  revalidateSite();
  return { ok: true };
}

/** Bulk save of the key/value strings on the settings screen. */
export async function saveSettings(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const entries: { key: string; value: string }[] = [];
  for (const [name, value] of formData.entries()) {
    if (!name.startsWith("s:")) continue;
    entries.push({ key: name.slice(2), value: String(value) });
  }
  if (!entries.length) return { ok: false, error: "چیزی برای ذخیره نبود" };

  try {
    await db.$transaction(
      entries.map((e) => db.setting.update({ where: { key: e.key }, data: { value: e.value } })),
    );
  } catch (e) {
    console.error("[admin] saveSettings", e);
    return { ok: false, error: "ذخیره نشد" };
  }

  revalidateSite();
  return { ok: true };
}
