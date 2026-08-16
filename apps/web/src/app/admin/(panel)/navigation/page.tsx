import CollectionEditor from "@/components/admin/CollectionEditor";
import { COLLECTIONS } from "@rahyad/core/admin";
import { loadCollection } from "../collection-data";

/** Both navigations on one screen — they're small and always edited together. */
export default async function Page() {
  const [dock, rail] = await Promise.all([loadCollection("dockLink"), loadCollection("railLink")]);

  return (
    <>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 20px" }}>منوها</h1>

      <CollectionEditor def={COLLECTIONS.dockLink} rows={dock.rows} media={dock.media} level={2} />

      <div style={{ height: 40 }} />

      <CollectionEditor def={COLLECTIONS.railLink} rows={rail.rows} media={rail.media} level={2} />
    </>
  );
}
