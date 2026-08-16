"use server";

import { revalidatePath } from "next/cache";
import { db } from "@rahyad/db";
import { requireAdmin } from "@/lib/auth";

/**
 * Moderation for reader comments. Every action re-checks the session — a
 * server action is a public endpoint, and the panel's layout guard does not
 * cover a request that never renders the panel.
 */

export type CommentResult = { ok: true } | { ok: false; error: string };

/** Approving changes what the article renders, so its page is dropped. */
async function revalidatePost(postId: string) {
  const post = await db.post.findUnique({ where: { id: postId }, select: { slug: true } });
  if (post) revalidatePath(`/magazine/${post.slug}`);
  revalidatePath("/admin/comments");
}

export async function setCommentApproved(
  id: string,
  approved: boolean,
): Promise<CommentResult> {
  await requireAdmin();

  try {
    const row = await db.postComment.update({
      where: { id },
      data: { approved },
      select: { postId: true },
    });
    await revalidatePost(row.postId);
  } catch (e) {
    console.error("[admin] setCommentApproved", e);
    return { ok: false, error: "انجام نشد" };
  }

  return { ok: true };
}

export async function deleteComment(id: string): Promise<CommentResult> {
  await requireAdmin();

  try {
    const gone = await db.postComment.delete({ where: { id }, select: { postId: true } });
    await revalidatePost(gone.postId);
  } catch (e) {
    console.error("[admin] deleteComment", e);
    return { ok: false, error: "حذف نشد" };
  }

  return { ok: true };
}
