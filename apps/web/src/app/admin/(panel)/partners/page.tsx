import CollectionEditor from "@/components/admin/CollectionEditor";
import { COLLECTIONS } from "@rahyad/core/admin";
import { loadCollection } from "../collection-data";

export default async function Page() {
  const { rows, media } = await loadCollection("partner");
  return <CollectionEditor def={COLLECTIONS.partner} rows={rows} media={media} />;
}
