import { LearningMap } from "@/components/LearningMap";
import { getPublicAtlasContent } from "@/lib/repository";

export default async function MapPage() {
  const atlas = await getPublicAtlasContent();

  return (
    <main>
      <LearningMap tricks={atlas.tricks} relations={atlas.relations} mapPositions={atlas.mapPositions} allowLocalEditorLayout={atlas.mode === "seed"} />
    </main>
  );
}
