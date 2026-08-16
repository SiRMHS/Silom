import CollectionEditor from "@/components/admin/CollectionEditor";
import { COLLECTIONS } from "@rahyad/core/admin";
import { loadCollection } from "../collection-data";

export default async function Page() {
  const { rows, media } = await loadCollection("bootWord");
  return <CollectionEditor def={COLLECTIONS.bootWord} rows={rows} media={media} />;
}
