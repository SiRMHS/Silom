import CollectionEditor from "@/components/admin/CollectionEditor";
import { COLLECTIONS } from "@rahyad/core/admin";
import { loadCollection } from "../collection-data";

export default async function Page() {
  const { rows, media } = await loadCollection("testimonial");
  return <CollectionEditor def={COLLECTIONS.testimonial} rows={rows} media={media} />;
}
