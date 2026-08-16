import { notFound } from "next/navigation";
import { db } from "@rahyad/db";
import { requireAdmin } from "@/lib/auth";
import PostEditor from "@/components/admin/PostEditor";
import { toFaqs } from "@rahyad/core";
import type { MediaItem } from "../../media-actions";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [post, media] = await Promise.all([
    db.post.findUnique({ where: { id } }),
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        filename: true,
        alt: true,
        width: true,
        height: true,
        size: true,
        mimeType: true,
      },
    }),
  ]);

  if (!post) notFound();

  return (
    <PostEditor
      media={media as MediaItem[]}
      post={{
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        category: post.category,
        tags: post.tags,
        accent: post.accent,
        coverId: post.coverId,
        visible: post.visible,
        publishedAt: post.publishedAt?.toISOString() ?? null,
        faqs: toFaqs(post.faqs),
      }}
    />
  );
}
