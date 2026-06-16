import { AdminConsole } from "@/components/AdminConsole";
import { AdminLocked } from "@/components/AdminLocked";
import { getAdminAtlasContent } from "@/lib/repository";
import { getAdminAccessState } from "@/lib/supabase/admin";

export default async function AdminPage() {
  const adminState = await getAdminAccessState();

  if (!adminState.isAdmin) {
    return <AdminLocked reason={adminState.reason} />;
  }

  const atlas = await getAdminAtlasContent();

  return (
    <main>
      <AdminConsole
        tricks={atlas.tricks}
        levels={atlas.levels}
        relations={atlas.relations}
        mapPositions={atlas.mapPositions}
        mediaAssets={atlas.mediaAssets}
        sources={atlas.sources}
        prototypeMode={adminState.mode === "prototype"}
      />
    </main>
  );
}
