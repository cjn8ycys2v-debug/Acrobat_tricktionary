import { LevelBoard } from "@/components/LevelBoard";
import { getPublicAtlasContent } from "@/lib/repository";

export default async function LevelsPage() {
  const atlas = await getPublicAtlasContent();

  return (
    <main>
      <LevelBoard levels={atlas.levels} tricks={atlas.tricks} />
    </main>
  );
}
