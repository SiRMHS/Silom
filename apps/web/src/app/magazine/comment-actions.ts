"use server";

import { headers } from "next/headers";
import { db } from "@rahyad/db";

/**
 * Takes a reader's comment on a magazine post.
 *
 * Public endpoint, so nothing the form claims is trusted: the post is looked up
 * server-side, lengths are capped, and the row is written unapproved. Nothing
 * reaches the page until someone approves it in the panel.
 */

const MAX_AUTHOR = 60;
const MAX_BODY = 2000;
const MIN_BODY = 2;

const WINDOW_MS = 5 * 60 * 1000;
const MAX_PER_WINDOW = 3;

export type CommentResult = { ok: true } | { ok: false; error: string };

export async function submitComment(
  slug: string,
  formData: FormData,
): Promise<CommentResult> {
  // Bots fill every field they find; a human never sees this one.
  if (String(formData.get("website") ?? "").trim()) return { ok: true };

  const author = String(formData.get("author") ?? "").trim().slice(0, MAX_AUTHOR);
  const body = String(formData.get("body") ?? "").trim().slice(0, MAX_BODY);

  if (!author) return { ok: false, error: "نام را بنویسید" };
  if (body.length < MIN_BODY) return { ok: false, error: "متن نظر را بنویسید" };

  // Only a published post accepts comments, and the id comes from the lookup
  // rather than from the form.
  const post = await db.post.findUnique({
    where: { slug },
    select: { id: true, visible: true },
  });
  if (!post || !post.visible) return { ok: false, error: "این نوشته پیدا نشد" };

  const ua = (await headers()).get("user-agent");

  // Cheap flood guard: one name can't fill the queue in a loop. Deliberately
  // reports success — telling a flooder that they were throttled only tells
  // them what to change.
  const recent = await db.postComment.count({
    where: {
      postId: post.id,
      author,
      createdAt: { gt: new Date(Date.now() - WINDOW_MS) },
    },
  });
  if (recent >= MAX_PER_WINDOW) return { ok: true };

  await db.postComment.create({
    data: {
      postId: post.id,
      author,
      body,
      userAgent: ua?.slice(0, 300) ?? null,
    },
  });

  // No revalidate: the comment is not public yet, so nothing on the page has
  // changed. Approving it in the panel is what refreshes the article.
  return { ok: true };
}
