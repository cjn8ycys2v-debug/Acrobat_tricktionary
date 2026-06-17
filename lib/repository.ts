import { allTricks, getFilterOptions, levelTests, mapPositions, sources, trickRelations } from "@/lib/atlas";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deriveDiscipline, sortDisciplines, sortFamilies } from "@/lib/taxonomy";
import type { LevelTest, MediaAsset, Source, Trick, TrickMapPosition, TrickRelation, TrickStatus } from "@/lib/types";

type SourceRow = {
  id: string;
  source_key: string;
  title: string;
  kind: Source["kind"];
  url: string | null;
  show_by_default: boolean;
};

type TrickRow = {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  summary: string;
  description: string;
  difficulty: number;
  risk_level: number;
  discipline?: string | null;
  family: string;
  axis: string;
  takeoff: string;
  landing: string;
  rope_context: string;
  tags: string[];
  level: number | null;
  level_category: string | null;
  status: TrickStatus;
  source_id: string | null;
  show_source: boolean;
};

type LevelRow = {
  level: number;
  category: string;
  title: string;
  pass_condition: string;
  trick_ids: string[];
  source_id: string | null;
};

type RelationRow = {
  id: string;
  from_trick_id: string;
  to_trick_id: string;
  type: TrickRelation["type"];
  note: string;
  strength: number;
};

type MediaRow = {
  id: string;
  trick_id: string;
  type: MediaAsset["type"];
  storage_path: string;
  duration: number | null;
  credit: string | null;
  consent_checked: boolean;
};

type MapPositionRow = {
  trick_id: string;
  x: number;
  y: number;
};

export type AtlasContent = {
  mode: "seed" | "supabase";
  sources: Source[];
  tricks: Trick[];
  levels: LevelTest[];
  relations: TrickRelation[];
  mapPositions: TrickMapPosition[];
  mediaAssets: MediaAsset[];
  options: ReturnType<typeof getFilterOptions>;
};

export function getSeedAtlasContent(): AtlasContent {
  return {
    mode: "seed",
    sources,
    tricks: allTricks,
    levels: levelTests,
    relations: trickRelations,
    mapPositions,
    mediaAssets: [],
    options: getFilterOptions()
  };
}

export async function getPublicAtlasContent(): Promise<AtlasContent> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) return getSeedAtlasContent();

  const supabase = await createSupabaseServerClient();
  if (!supabase) return getSeedAtlasContent();

  const [sourcesResult, tricksResult, levelsResult, relationsResult, mediaResult, mapPositionsResult] = await Promise.all([
    supabase.from("sources").select("id, source_key, title, kind, url, show_by_default"),
    supabase.from("tricks").select("*").eq("status", "published").order("level", { ascending: true }).order("name", { ascending: true }),
    supabase.from("level_tests").select("level, category, title, pass_condition, trick_ids, source_id").order("level", { ascending: true }),
    supabase.from("trick_relations").select("id, from_trick_id, to_trick_id, type, note, strength"),
    supabase.from("media_assets").select("id, trick_id, type, storage_path, duration, credit, consent_checked"),
    supabase.from("trick_map_positions").select("trick_id, x, y")
  ]);

  if (sourcesResult.error || tricksResult.error || levelsResult.error || relationsResult.error || mediaResult.error) {
    return getSeedAtlasContent();
  }

  return mapAtlasRows({
    mode: "supabase",
    sourceRows: (sourcesResult.data ?? []) as SourceRow[],
    trickRows: (tricksResult.data ?? []) as TrickRow[],
    levelRows: (levelsResult.data ?? []) as LevelRow[],
    relationRows: (relationsResult.data ?? []) as RelationRow[],
    mapPositionRows: mapPositionsResult.error ? [] : ((mapPositionsResult.data ?? []) as MapPositionRow[]),
    mediaRows: (mediaResult.data ?? []) as MediaRow[]
  });
}

export async function getAdminAtlasContent(): Promise<AtlasContent> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) return getSeedAtlasContent();

  const supabase = await createSupabaseServerClient();
  if (!supabase) return getSeedAtlasContent();

  const [sourcesResult, tricksResult, levelsResult, relationsResult, mediaResult, mapPositionsResult] = await Promise.all([
    supabase.from("sources").select("id, source_key, title, kind, url, show_by_default"),
    supabase.from("tricks").select("*").order("level", { ascending: true }).order("name", { ascending: true }),
    supabase.from("level_tests").select("level, category, title, pass_condition, trick_ids, source_id").order("level", { ascending: true }),
    supabase.from("trick_relations").select("id, from_trick_id, to_trick_id, type, note, strength"),
    supabase.from("media_assets").select("id, trick_id, type, storage_path, duration, credit, consent_checked"),
    supabase.from("trick_map_positions").select("trick_id, x, y")
  ]);

  if (sourcesResult.error || tricksResult.error || levelsResult.error || relationsResult.error || mediaResult.error) {
    return getSeedAtlasContent();
  }

  return mapAtlasRows({
    mode: "supabase",
    sourceRows: (sourcesResult.data ?? []) as SourceRow[],
    trickRows: (tricksResult.data ?? []) as TrickRow[],
    levelRows: (levelsResult.data ?? []) as LevelRow[],
    relationRows: (relationsResult.data ?? []) as RelationRow[],
    mapPositionRows: mapPositionsResult.error ? [] : ((mapPositionsResult.data ?? []) as MapPositionRow[]),
    mediaRows: (mediaResult.data ?? []) as MediaRow[]
  });
}

function mapAtlasRows({
  mode,
  sourceRows,
  trickRows,
  levelRows,
  relationRows,
  mapPositionRows,
  mediaRows
}: {
  mode: "supabase";
  sourceRows: SourceRow[];
  trickRows: TrickRow[];
  levelRows: LevelRow[];
  relationRows: RelationRow[];
  mapPositionRows: MapPositionRow[];
  mediaRows: MediaRow[];
}): AtlasContent {
  const sourceKeyByUuid = new Map(sourceRows.map((source) => [source.id, source.source_key]));
  const mappedSources = sourceRows.map(mapSource);
  const mappedTricks = trickRows.map((row) => mapTrick(row, sourceKeyByUuid));
  const trickById = new Map(mappedTricks.map((trick) => [trick.id, trick]));

  const mappedLevels = levelRows.map((level) => ({
    level: level.level,
    category: level.category,
    title: level.title,
    passCondition: level.pass_condition,
    sourceId: level.source_id ? sourceKeyByUuid.get(level.source_id) ?? level.source_id : "",
    trickNames: (level.trick_ids ?? []).map((id) => trickById.get(id)?.name).filter((name): name is string => Boolean(name))
  }));

  const mappedRelations = relationRows
    .filter((relation) => trickById.has(relation.from_trick_id) && trickById.has(relation.to_trick_id))
    .map((relation) => ({
      id: relation.id,
      fromTrickId: relation.from_trick_id,
      toTrickId: relation.to_trick_id,
      type: relation.type,
      note: relation.note,
      strength: normalizeRating(relation.strength)
    }));

  const mappedMedia = mediaRows
    .filter((media) => trickById.has(media.trick_id))
    .map(mapMedia);

  const mappedMapPositions = mapPositionRows
    .filter((position) => trickById.has(position.trick_id))
    .map((position) => ({
      trickId: position.trick_id,
      x: position.x,
      y: position.y
    }));

  return {
    mode,
    sources: mappedSources,
    tricks: mappedTricks,
    levels: mappedLevels,
    relations: mappedRelations,
    mapPositions: mappedMapPositions,
    mediaAssets: mappedMedia,
    options: makeOptions(mappedTricks)
  };
}

function mapSource(row: SourceRow): Source {
  return {
    id: row.source_key,
    title: row.title,
    kind: row.kind,
    url: row.url ?? undefined,
    showByDefault: row.show_by_default
  };
}

function mapTrick(row: TrickRow, sourceKeyByUuid: Map<string, string>): Trick {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    aliases: row.aliases ?? [],
    summary: row.summary,
    description: row.description,
    difficulty: normalizeRating(row.difficulty),
    riskLevel: normalizeRating(row.risk_level),
    discipline: row.discipline ?? deriveDiscipline(row.name, row.family),
    family: row.family,
    axis: row.axis,
    takeoff: row.takeoff,
    landing: row.landing,
    ropeContext: row.rope_context,
    tags: row.tags ?? [],
    level: row.level ?? 0,
    levelCategory: row.level_category ?? "未分類",
    status: row.status,
    sourceId: row.source_id ? sourceKeyByUuid.get(row.source_id) ?? row.source_id : "",
    showSource: row.show_source
  };
}

function mapMedia(row: MediaRow): MediaAsset {
  return {
    id: row.id,
    trickId: row.trick_id,
    type: row.type,
    storagePath: row.storage_path,
    duration: row.duration ?? undefined,
    credit: row.credit ?? undefined,
    consentChecked: row.consent_checked
  };
}

function normalizeRating(value: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(1, Math.min(5, value)) as 1 | 2 | 3 | 4 | 5;
}

function makeOptions(tricks: Trick[]) {
  return {
    disciplines: sortDisciplines(Array.from(new Set(tricks.map((trick) => trick.discipline)))),
    families: sortFamilies(Array.from(new Set(tricks.map((trick) => trick.family)))),
    axes: Array.from(new Set(tricks.map((trick) => trick.axis))).sort(),
    takeoffs: Array.from(new Set(tricks.map((trick) => trick.takeoff))).sort(),
    landings: Array.from(new Set(tricks.map((trick) => trick.landing))).sort(),
    ropeContexts: Array.from(new Set(tricks.map((trick) => trick.ropeContext))).sort(),
    tags: Array.from(new Set(tricks.flatMap((trick) => trick.tags))).sort()
  };
}
