import CollectionEditor from "@/components/admin/CollectionEditor";
import { COLLECTIONS } from "@rahyad/core/admin";
import { loadCollection } from "../collection-data";

export default async function Page() {
  const { rows, media } = await loadCollection("teamMember");
  return <CollectionEditor def={COLLECTIONS.teamMember} rows={rows} media={media} />;
}
