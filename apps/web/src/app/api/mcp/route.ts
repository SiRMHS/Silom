import { NextResponse } from "next/server";
import { db } from "@rahyad/db";
import { COLLECTIONS, MODEL_KEYS, type ModelKey } from "@rahyad/core/admin";
import { getCurrentUser } from "@/lib/auth";
import { newProject, saveProject, deleteProject } from "@/app/admin/(panel)/project-actions";
import { newPost, savePost, deletePost } from "@/app/admin/(panel)/post-actions";
import { newService, saveService, deleteService } from "@/app/admin/(panel)/service-actions";
import { createItem, saveItem, deleteItem } from "@/app/admin/(panel)/content-actions";

/**
 * An MCP server over the panel.
 *
 * Deliberately thin: every write goes through the same server actions the
 * admin screens call, so slugs, sanitising, defaults and cache busting behave
 * identically whether a person or an agent wrote the case study. The route
 * only translates JSON-RPC into the FormData those actions read.
 *
 * Auth is the MCP_TOKEN bearer handled in lib/auth — without it, requireAdmin
 * inside the actions redirects and nothing here can write.
 */

export const dynamic = "force-dynamic";

type Kind = "project" | "post" | "service" | ModelKey;

const PAGE_KINDS = ["project", "post", "service"] as const;
const KINDS: Kind[] = [...PAGE_KINDS, ...MODEL_KEYS];

const isKind = (k: unknown): k is Kind => typeof k === "string" && KINDS.includes(k as Kind);

/** Fields a given kind accepts, for the tool description the agent reads. */
function fieldList(kind: Kind) {
  switch (kind) {
    case "project":
      return "title, slug, category, year, tags[], color, client, role, summary, sections[{h,p}], faqs[{q,a}], imageId, filmId, gallery[mediaId], services[serviceId], col, row, w, h, visible";
    case "post":
      return "title, slug, excerpt, body (HTML), category, tags[], accent, coverId, faqs[{q,a}], visible";
    case "service":
      return "title, slug, indexLabel, accent, body, tags[], headline, excerpt, ctaTitle, ctaNote, sections[{h,p}], faqs[{q,a}], imageId, filmId, gallery[mediaId], visible";
    default:
      return COLLECTIONS[kind as ModelKey].fields.map((f) => f.name).join(", ");
  }
}

/**
 * JSON fields → the form the panel posts. Repeaters are indexed because that
 * index is the display order the actions read them back in.
 */
function toFormData(fields: Record<string, unknown>): FormData {
  const form = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;

    if (key === "sections" && Array.isArray(value)) {
      value.forEach((b, i) => {
        const block = b as { h?: string; p?: string };
        form.set(`sec.h.${i}`, block.h ?? "");
        form.set(`sec.p.${i}`, block.p ?? "");
      });
      continue;
    }

    if (key === "faqs" && Array.isArray(value)) {
      value.forEach((r, i) => {
        const row = r as { q?: string; a?: string };
        form.set(`faq.q.${i}`, row.q ?? "");
        form.set(`faq.a.${i}`, row.a ?? "");
      });
      continue;
    }

    if (key === "gallery" && Array.isArray(value)) {
      value.forEach((id, i) => form.set(`gallery.${i}`, String(id)));
      continue;
    }

    if (key === "services" && Array.isArray(value)) {
      value.forEach((id) => form.append("service", String(id)));
      continue;
    }

    // An unchecked box is absent from the payload, which is how the actions
    // read every boolean — so `false` means omit the key entirely.
    if (typeof value === "boolean") {
      if (value) form.set(key, "on");
      continue;
    }

    form.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }

  return form;
}

function delegate(kind: Kind) {
  return (db as unknown as Record<string, {
    findMany(args?: unknown): Promise<unknown[]>;
    findFirst(args: unknown): Promise<unknown>;
  }>)[kind];
}

async function run(name: string, args: Record<string, unknown>) {
  const kind = args.kind;
  if (!isKind(kind)) throw new Error(`unknown kind; expected one of ${KINDS.join(", ")}`);

  const isPage = (PAGE_KINDS as readonly string[]).includes(kind);
  const fields = (args.fields ?? {}) as Record<string, unknown>;
  const id = typeof args.id === "string" ? args.id : "";

  switch (name) {
    case "list": {
      const rows = await delegate(kind).findMany({
        orderBy: isPage && kind === "post" ? { createdAt: "desc" } : [{ order: "asc" }, { id: "asc" }],
        ...(isPage
          ? { select: { id: true, slug: true, title: true, visible: true } }
          : {}),
      });
      return rows;
    }

    case "get": {
      if (!id && typeof args.slug !== "string") throw new Error("id or slug is required");
      const where = id ? { id } : { slug: args.slug as string };
      const row = await delegate(kind).findFirst({
        where,
        // Posts have no gallery; only the two kinds that do get the joins.
        ...(kind === "project" || kind === "service"
          ? {
              include: {
                gallery: { orderBy: { order: "asc" }, select: { mediaId: true } },
                ...(kind === "project" ? { services: { select: { serviceId: true } } } : {}),
              },
            }
          : {}),
      });
      if (!row) throw new Error("not found");
      return row;
    }

    case "create": {
      if (!isPage) {
        const made = await createItem(kind as ModelKey);
        if (!made.ok) throw new Error(made.error);
        // The generic action creates from defaults only, so the fields the
        // agent sent land in the follow-up update.
        const rows = (await delegate(kind).findMany({
          orderBy: { order: "desc" },
          take: 1,
        })) as { id: string }[];
        const fresh = rows[0]?.id ?? "";
        if (fresh && Object.keys(fields).length) {
          const form = toFormData({ ...fields, id: fresh });
          const saved = await saveItem(kind as ModelKey, form);
          if (!saved.ok) throw new Error(saved.error);
        }
        return { id: fresh };
      }

      const newId =
        kind === "project" ? await newProject() : kind === "post" ? await newPost() : await newService();

      if (Object.keys(fields).length) {
        await run("update", { kind, id: newId, fields });
      }
      return { id: newId };
    }

    case "update": {
      if (!id) throw new Error("id is required");

      // The canvas placement is a panel-only concern an agent never sends, and
      // an absent number reads as 0 — which would collapse the tile. Carry the
      // current values over instead.
      if (kind === "project") {
        const tile = await db.project.findUnique({
          where: { id },
          select: { col: true, row: true, w: true, h: true },
        });
        if (tile) for (const [k, v] of Object.entries(tile)) fields[k] ??= v;
      }

      const form = toFormData(fields);

      if (kind === "project") {
        const r = await saveProject(id, form);
        if (!r.ok) throw new Error(r.error);
      } else if (kind === "post") {
        const r = await savePost(id, form);
        if (!r.ok) throw new Error(r.error);
      } else if (kind === "service") {
        const r = await saveService(id, form);
        if (!r.ok) throw new Error(r.error);
      } else {
        form.set("id", id);
        const r = await saveItem(kind as ModelKey, form);
        if (!r.ok) throw new Error(r.error);
      }
      return { id, ok: true };
    }

    case "delete": {
      if (!id) throw new Error("id is required");
      const r =
        kind === "project"
          ? await deleteProject(id)
          : kind === "post"
            ? await deletePost(id)
            : kind === "service"
              ? await deleteService(id)
              : await deleteItem(kind as ModelKey, id);
      if (!r.ok) throw new Error(r.error);
      return { ok: true };
    }

    default:
      throw new Error(`unknown tool ${name}`);
  }
}

const kindSchema = {
  type: "string",
  enum: KINDS,
  description:
    "project = case study, post = magazine article, service = service page; the rest are panel collections.",
};

const TOOLS = [
  {
    name: "list",
    description: "Rows of one kind, newest or in panel order.",
    inputSchema: { type: "object", properties: { kind: kindSchema }, required: ["kind"] },
  },
  {
    name: "get",
    description: "One row in full, by id or slug — read it before updating, writes replace fields wholesale.",
    inputSchema: {
      type: "object",
      properties: { kind: kindSchema, id: { type: "string" }, slug: { type: "string" } },
      required: ["kind"],
    },
  },
  {
    name: "create",
    description:
      "Creates a row (hidden until you set visible) and writes `fields` into it. " +
      KINDS.map((k) => `${k}: ${fieldList(k)}`).join(" | "),
    inputSchema: {
      type: "object",
      properties: { kind: kindSchema, fields: { type: "object" } },
      required: ["kind"],
    },
  },
  {
    name: "update",
    description:
      "Writes `fields` into an existing row. Omitted fields are reset to their empty value, so send the whole row — `get` it first.",
    inputSchema: {
      type: "object",
      properties: { kind: kindSchema, id: { type: "string" }, fields: { type: "object" } },
      required: ["kind", "id", "fields"],
    },
  },
  {
    name: "delete",
    description: "Removes a row for good.",
    inputSchema: {
      type: "object",
      properties: { kind: kindSchema, id: { type: "string" } },
      required: ["kind", "id"],
    },
  },
];

export async function POST(request: Request) {
  const rpc = (await request.json()) as { id?: unknown; method?: string; params?: Record<string, unknown> };
  const reply = (result: unknown) => NextResponse.json({ jsonrpc: "2.0", id: rpc.id ?? null, result });

  // The token is checked here as well as inside the actions, so a bad token
  // never gets as far as a tool listing.
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { jsonrpc: "2.0", id: rpc.id ?? null, error: { code: -32001, message: "unauthorized" } },
      { status: 401 },
    );
  }

  switch (rpc.method) {
    case "initialize":
      return reply({
        protocolVersion: "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "rahyad", version: "1.0.0" },
      });

    case "notifications/initialized":
      return new NextResponse(null, { status: 202 });

    case "tools/list":
      return reply({ tools: TOOLS });

    case "tools/call": {
      const { name, arguments: args } = (rpc.params ?? {}) as {
        name?: string;
        arguments?: Record<string, unknown>;
      };
      try {
        const out = await run(String(name), args ?? {});
        return reply({ content: [{ type: "text", text: JSON.stringify(out) }] });
      } catch (e) {
        return reply({
          content: [{ type: "text", text: e instanceof Error ? e.message : "failed" }],
          isError: true,
        });
      }
    }

    default:
      return NextResponse.json({
        jsonrpc: "2.0",
        id: rpc.id ?? null,
        error: { code: -32601, message: `unknown method ${rpc.method}` },
      });
  }
}
