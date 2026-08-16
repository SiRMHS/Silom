import MediaLibrary from "@/components/admin/MediaLibrary";
import { listMedia } from "../media-actions";

export default async function Page() {
  const items = await listMedia();
  return <MediaLibrary items={items} />;
}
