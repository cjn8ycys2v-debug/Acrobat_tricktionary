"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps
} from "@xyflow/react";
import { CheckCircle2, Circle, RotateCcw, Search, Sparkles, Trophy } from "lucide-react";
import "@xyflow/react/dist/style.css";
import { isPrimarySkillRelation, makeDirectSkillTreeRelations, makeLevelColumnLayoutMap } from "@/lib/map-layout";
import { sortDisciplines, sortFamilies } from "@/lib/taxonomy";
import type { RelationType, Trick, TrickMapPosition, TrickRelation } from "@/lib/types";
import { relationLabel } from "@/lib/utils";

const storageKey = "dd-acro-mastered-tricks";
export const editorLayoutStorageKey = "dd-acro-editor-map-layout-v2";

const edgeStyles: Record<RelationType, { color: string; label: string }> = {
  prerequisite: { color: "#24514a", label: "前提" },
  progression: { color: "#d76147", label: "派生" },
  variation: { color: "#4f83c4", label: "変化" },
  combo: { color: "#8a5bbf", label: "連携" }
};

const relationTypeOrder: RelationType[] = ["prerequisite", "progression", "variation", "combo"];
const defaultRelationTypeFilters: RelationType[] = ["prerequisite", "progression"];
const allDisciplineFilter = "__all__";
const allFamilyFilter = "__all__";

const familyPalette = [
  { bg: "#e3f3ee", border: "#24514a", solid: "#24514a", text: "#163c36" },
  { bg: "#fff0ec", border: "#d76147", solid: "#d76147", text: "#7e2e20" },
  { bg: "#e5f5fb", border: "#317aa3", solid: "#317aa3", text: "#1d4f69" },
  { bg: "#f0e8fb", border: "#8a5bbf", solid: "#8a5bbf", text: "#55327a" },
  { bg: "#fff7df", border: "#c48a1b", solid: "#c48a1b", text: "#6b4a0f" },
  { bg: "#fdebf3", border: "#bf3f6f", solid: "#bf3f6f", text: "#7a2648" },
  { bg: "#eef3f5", border: "#455a64", solid: "#455a64", text: "#2f3f46" },
  { bg: "#f0f5de", border: "#6b7f2a", solid: "#6b7f2a", text: "#435118" }
];

type SkillNodeData = {
  name: string;
  slug: string;
  level: number;
  discipline: string;
  family: string;
  familyStyle: (typeof familyPalette)[number];
  checked: boolean;
  onToggle: (id: string, checked: boolean) => void;
};

type SkillTreeNode = Node<SkillNodeData, "skill">;

const nodeTypes = {
  skill: SkillNode
};

export function LearningMap({
  tricks,
  relations,
  mapPositions = [],
  allowLocalEditorLayout = false
}: {
  tricks: Trick[];
  relations: TrickRelation[];
  mapPositions?: TrickMapPosition[];
  allowLocalEditorLayout?: boolean;
}) {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(() => new Set());
  const [localEditorPositions, setLocalEditorPositions] = useState<TrickMapPosition[]>([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState(allDisciplineFilter);
  const [selectedFamily, setSelectedFamily] = useState(allFamilyFilter);
  const [relationTypeFilters, setRelationTypeFilters] = useState<RelationType[]>(defaultRelationTypeFilters);
  const [directOnly, setDirectOnly] = useState(true);
  const [query, setQuery] = useState("");
  const initialFocusApplied = useRef(false);

  useEffect(() => {
    const updateViewportMode = () => setIsCompactViewport(window.innerWidth < 640);
    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setMasteredIds(new Set(JSON.parse(raw) as string[]));
    } catch {
      setMasteredIds(new Set());
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    window.localStorage.setItem(storageKey, JSON.stringify(Array.from(masteredIds)));
  }, [isLoaded, masteredIds]);

  useEffect(() => {
    if (!allowLocalEditorLayout) return;
    try {
      const raw = window.localStorage.getItem(editorLayoutStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as TrickMapPosition[];
      setLocalEditorPositions(parsed.filter((position) => typeof position.trickId === "string" && Number.isFinite(position.x) && Number.isFinite(position.y)));
    } catch {
      setLocalEditorPositions([]);
    }
  }, [allowLocalEditorLayout]);

  const trickById = useMemo(() => new Map(tricks.map((trick) => [trick.id, trick])), [tricks]);

  const allGraphRelations = useMemo(
    () => relations.filter((relation) => trickById.has(relation.fromTrickId) && trickById.has(relation.toTrickId)),
    [relations, trickById]
  );

  const allGraphTricks = useMemo(() => {
    const ids = new Set<string>();
    for (const relation of allGraphRelations) {
      ids.add(relation.fromTrickId);
      ids.add(relation.toTrickId);
    }
    return tricks.filter((trick) => ids.has(trick.id));
  }, [allGraphRelations, tricks]);

  useEffect(() => {
    if (initialFocusApplied.current || !allGraphTricks.length) return;
    const params = new URLSearchParams(window.location.search);
    const focusValue = (params.get("trick") ?? params.get("q") ?? "").trim();
    initialFocusApplied.current = true;
    if (!focusValue) return;

    const focused = allGraphTricks.find((trick) => trick.slug === focusValue || trick.id === focusValue || trick.name === focusValue);
    setSelectedDiscipline(allDisciplineFilter);
    setSelectedFamily(allFamilyFilter);
    setRelationTypeFilters(defaultRelationTypeFilters);
    setDirectOnly(true);
    setQuery(focused?.name ?? focusValue);
    if (focused) setActiveNodeId(focused.id);
  }, [allGraphTricks]);

  const familyStyles = useMemo(() => {
    const families = sortFamilies(Array.from(new Set(allGraphTricks.map((trick) => trick.family))));
    return new Map(families.map((family, index) => [family, familyPalette[index % familyPalette.length]]));
  }, [allGraphTricks]);

  const disciplineStats = useMemo(
    () =>
      sortDisciplines(Array.from(new Set(allGraphTricks.map((trick) => trick.discipline)))).map((discipline) => {
        const disciplineTricks = allGraphTricks.filter((trick) => trick.discipline === discipline);
        const done = disciplineTricks.filter((trick) => masteredIds.has(trick.id)).length;
        return { discipline, total: disciplineTricks.length, done };
      }),
    [allGraphTricks, masteredIds]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const activeRelationTypes = useMemo(() => new Set(relationTypeFilters), [relationTypeFilters]);

  const scopedRelations = useMemo(
    () => {
      const filtered = allGraphRelations.filter((relation) => {
        if (!activeRelationTypes.has(relation.type)) return false;
        const from = trickById.get(relation.fromTrickId);
        const to = trickById.get(relation.toTrickId);
        if (selectedDiscipline !== allDisciplineFilter && from?.discipline !== selectedDiscipline && to?.discipline !== selectedDiscipline) return false;
        if (selectedFamily === allFamilyFilter) return true;
        return from?.family === selectedFamily || to?.family === selectedFamily;
      });

      if (!directOnly) return filtered;

      const primary = makeDirectSkillTreeRelations(
        filtered.filter((relation) => isPrimarySkillRelation(relation)),
        allGraphTricks
      );
      return [...primary, ...filtered.filter((relation) => !isPrimarySkillRelation(relation))];
    },
    [activeRelationTypes, allGraphRelations, allGraphTricks, directOnly, selectedDiscipline, selectedFamily, trickById]
  );

  const visibleTricks = useMemo(() => {
    const filteredByScope = allGraphTricks.filter(
      (trick) =>
        (selectedDiscipline === allDisciplineFilter || trick.discipline === selectedDiscipline) &&
        (selectedFamily === allFamilyFilter || trick.family === selectedFamily)
    );

    if (!normalizedQuery) return filteredByScope;

    const matchedIds = new Set<string>();
    for (const trick of filteredByScope) {
      if (matchesTrickQuery(trick, normalizedQuery)) matchedIds.add(trick.id);
    }

    const contextualIds = new Set(matchedIds);
    for (const relation of scopedRelations) {
      if (matchedIds.has(relation.fromTrickId) || matchedIds.has(relation.toTrickId)) {
        contextualIds.add(relation.fromTrickId);
        contextualIds.add(relation.toTrickId);
      }
    }

    return filteredByScope.filter((trick) => contextualIds.has(trick.id));
  }, [allGraphTricks, normalizedQuery, scopedRelations, selectedDiscipline, selectedFamily]);

  const visibleTrickIds = useMemo(() => new Set(visibleTricks.map((trick) => trick.id)), [visibleTricks]);

  const graphRelations = useMemo(
    () =>
      scopedRelations.filter((relation) => {
        if (!visibleTrickIds.has(relation.fromTrickId) || !visibleTrickIds.has(relation.toTrickId)) return false;
        if (!normalizedQuery) return true;
        const from = trickById.get(relation.fromTrickId);
        const to = trickById.get(relation.toTrickId);
        return Boolean((from && matchesTrickQuery(from, normalizedQuery)) || (to && matchesTrickQuery(to, normalizedQuery)));
      }),
    [normalizedQuery, scopedRelations, trickById, visibleTrickIds]
  );

  const positionByTrickId = useMemo(() => {
    const official = new Map(mapPositions.map((position) => [position.trickId, position]));
    if (!allowLocalEditorLayout || !localEditorPositions.length) return official;
    return new Map([...official, ...localEditorPositions.map((position) => [position.trickId, position] as const)]);
  }, [allowLocalEditorLayout, localEditorPositions, mapPositions]);

  const autoPositionByTrickId = useMemo(() => makeLevelColumnLayoutMap(visibleTricks, graphRelations), [graphRelations, visibleTricks]);

  const toggleMastered = useCallback((id: string, checked: boolean) => {
    setMasteredIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const nodes: SkillTreeNode[] = useMemo(() => {
    return visibleTricks
      .map((trick) => ({
        id: trick.id,
        type: "skill" as const,
        position: positionByTrickId.get(trick.id) ?? autoPositionByTrickId.get(trick.id) ?? { x: 0, y: 0 },
        style: { width: 206, height: 74 },
        data: {
          name: trick.name,
          slug: trick.slug,
          level: trick.level,
          discipline: trick.discipline,
          family: trick.family,
          familyStyle: familyStyles.get(trick.family) ?? familyPalette[0],
          checked: masteredIds.has(trick.id),
          onToggle: toggleMastered
        }
      }))
      .sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
  }, [autoPositionByTrickId, familyStyles, masteredIds, positionByTrickId, toggleMastered, visibleTricks]);

  const edges: Edge[] = useMemo(
    () =>
      graphRelations.map((relation) => {
        const edgeStyle = edgeStyles[relation.type];
        const isConnected = activeNodeId === relation.fromTrickId || activeNodeId === relation.toTrickId;
        const isDimmed = Boolean(activeNodeId && !isConnected);

        return {
          id: relation.id,
          source: relation.fromTrickId,
          target: relation.toTrickId,
          type: "smoothstep",
          label: relationLabel(relation.type),
          markerEnd: { type: MarkerType.ArrowClosed, color: edgeStyle.color },
          style: {
            stroke: edgeStyle.color,
            strokeWidth: isConnected ? 4 : 2.4,
            opacity: isDimmed ? 0.16 : 0.95
          },
          labelStyle: {
            fontWeight: 800,
            fill: isDimmed ? "rgba(45,48,53,.36)" : "#2d3035"
          },
          labelBgPadding: [7, 4],
          labelBgBorderRadius: 6,
          labelBgStyle: {
            fill: isDimmed ? "rgba(246,242,234,.64)" : "#fffaf0",
            fillOpacity: 0.96
          }
        };
      }),
    [activeNodeId, graphRelations]
  );

  const masteredCount = visibleTricks.filter((trick) => masteredIds.has(trick.id)).length;
  const masteredRate = visibleTricks.length ? Math.round((masteredCount / visibleTricks.length) * 100) : 0;
  const nextMilestone = Math.min(visibleTricks.length, Math.ceil((masteredCount + 1) / 5) * 5);
  const remainingToMilestone = Math.max(0, nextMilestone - masteredCount);
  const familyStats = Array.from(familyStyles.entries()).map(([family, style]) => {
    const familyTricks = allGraphTricks.filter((trick) => trick.family === family);
    const done = familyTricks.filter((trick) => masteredIds.has(trick.id)).length;
    return { family, style, total: familyTricks.length, done };
  });
  const relationStats = relationTypeOrder.map((type) => ({
    type,
    count: allGraphRelations.filter((relation) => relation.type === type).length,
    style: edgeStyles[type],
    active: relationTypeFilters.includes(type)
  }));
  const isDefaultRelationFilter =
    relationTypeFilters.length === defaultRelationTypeFilters.length && defaultRelationTypeFilters.every((type) => relationTypeFilters.includes(type));
  const hasFilters = selectedDiscipline !== allDisciplineFilter || selectedFamily !== allFamilyFilter || !isDefaultRelationFilter || !directOnly || Boolean(normalizedQuery);
  const mapViewKey = [
    isCompactViewport ? "compact-skill-tree" : "wide-skill-tree",
    selectedDiscipline,
    selectedFamily,
    relationTypeFilters.join("-"),
    directOnly ? "direct" : "all",
    normalizedQuery
  ].join(":");

  function toggleRelationType(type: RelationType) {
    setRelationTypeFilters((current) => {
      if (current.includes(type)) {
        const next = current.filter((item) => item !== type);
        return next.length ? next : defaultRelationTypeFilters;
      }
      return relationTypeOrder.filter((item) => item === type || current.includes(item));
    });
  }

  function resetMapFilters() {
    setSelectedDiscipline(allDisciplineFilter);
    setSelectedFamily(allFamilyFilter);
    setRelationTypeFilters(defaultRelationTypeFilters);
    setDirectOnly(true);
    setQuery("");
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 inline-flex rounded bg-skywash px-3 py-1 text-sm font-bold text-pine">Skill Tree</p>
          <h1 className="text-2xl font-black text-ink sm:text-4xl">相関マップ</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-graphite/76">
            基礎技を左に置き、前提・派生を右へ広げるスキルツリーです。分野ごとに上下のレーンを分け、直接関係のある矢印を中心に表示します。
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(240px,320px)_auto] sm:items-end">
          <div className="rounded border border-ink/10 bg-white px-3 py-3 shadow-sm sm:px-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black text-graphite/60">習得チェック</p>
              <span className="inline-flex items-center gap-1 rounded bg-saffron/20 px-2 py-1 text-xs font-black text-ink">
                <Trophy aria-hidden className="size-3.5 text-saffron" />
                {masteredRate}%
              </span>
            </div>
            <p className="mt-1 text-2xl font-black text-ink">
              {masteredCount}
              <span className="text-sm text-graphite/58"> / {visibleTricks.length}</span>
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded bg-paper">
              <div className="h-full rounded bg-pine transition-all" style={{ width: `${masteredRate}%` }} />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-graphite/68">
              <Sparkles aria-hidden className="size-3.5 text-coral" />
              {remainingToMilestone ? `あと${remainingToMilestone}個で次の区切り` : "区切り達成"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMasteredIds(new Set())}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded border border-ink/14 bg-white px-4 text-sm font-black text-graphite transition hover:border-coral hover:text-coral sm:w-auto"
          >
            <RotateCcw aria-hidden className="size-4" />
            リセット
          </button>
        </div>
      </div>

      <div className="mb-4 rounded border border-ink/10 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black text-graphite/62">表示範囲</p>
            <p className="mt-1 text-sm font-black text-ink">
              {visibleTricks.length} / {allGraphTricks.length} 技
              <span className="ml-2 text-xs text-graphite/58">{graphRelations.length} / {allGraphRelations.length} 本</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex h-10 min-w-0 items-center gap-2 rounded border border-ink/12 bg-paper px-3 text-sm focus-within:border-pine sm:w-72">
              <Search aria-hidden className="size-4 shrink-0 text-graphite/42" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="技名・系統・タグで探す"
                className="h-full min-w-0 flex-1 bg-transparent outline-none"
              />
            </label>
            {hasFilters ? (
              <button
                type="button"
                onClick={resetMapFilters}
                className="inline-flex h-10 items-center justify-center gap-2 rounded border border-ink/14 px-3 text-sm font-black text-graphite transition hover:border-coral hover:text-coral"
              >
                <RotateCcw aria-hidden className="size-4" />
                表示を戻す
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1fr_auto]">
          <div>
            <p className="mb-2 text-xs font-black text-graphite/62">大分類</p>
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedDiscipline(allDisciplineFilter)}
                className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 text-xs font-black transition ${
                  selectedDiscipline === allDisciplineFilter ? "border-ink bg-ink text-white" : "border-ink/10 bg-paper text-graphite hover:border-pine"
                }`}
              >
                すべて
                <span className={`rounded px-1.5 py-0.5 text-[10px] ${selectedDiscipline === allDisciplineFilter ? "bg-white/18 text-white" : "bg-white text-graphite/70"}`}>
                  {allGraphTricks.length}
                </span>
              </button>
              {disciplineStats.map((item) => {
                const isActive = selectedDiscipline === item.discipline;
                return (
                  <button
                    key={item.discipline}
                    type="button"
                    onClick={() => setSelectedDiscipline(item.discipline)}
                    className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 text-xs font-black transition ${
                      isActive ? "border-ink bg-ink text-white" : "border-ink/10 bg-white text-graphite hover:border-pine"
                    }`}
                  >
                    {item.discipline}
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${isActive ? "bg-white/18 text-white" : "bg-paper text-graphite/70"}`}>
                      {item.done}/{item.total}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mb-2 text-xs font-black text-graphite/62">系統</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedFamily(allFamilyFilter)}
                className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 text-xs font-black transition ${
                  selectedFamily === allFamilyFilter ? "border-ink bg-ink text-white" : "border-ink/10 bg-paper text-graphite hover:border-pine"
                }`}
              >
                すべて
                <span className={`rounded px-1.5 py-0.5 text-[10px] ${selectedFamily === allFamilyFilter ? "bg-white/18 text-white" : "bg-white text-graphite/70"}`}>
                  {allGraphTricks.length}
                </span>
              </button>
              {familyStats.map((item) => {
                const isActive = selectedFamily === item.family;
                return (
                  <button
                    key={item.family}
                    type="button"
                    onClick={() => setSelectedFamily(item.family)}
                    className="inline-flex items-center gap-2 rounded border px-3 py-1.5 text-xs font-black transition hover:shadow-sm"
                    style={{
                      borderColor: item.style.border,
                      backgroundColor: isActive ? item.style.solid : "#ffffff",
                      color: isActive ? "#ffffff" : item.style.text
                    }}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-current" />
                    {item.family}
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${isActive ? "bg-white/18 text-white" : "bg-paper text-graphite/70"}`}>
                      {item.done}/{item.total}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-black text-graphite/62">線の種類</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDirectOnly((current) => !current)}
                className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 text-xs font-black transition ${
                  directOnly ? "border-pine bg-pine text-white shadow-sm" : "border-ink/10 bg-paper text-graphite/68 hover:border-pine"
                }`}
              >
                直接のみ
                <span className={`rounded px-1.5 py-0.5 text-[10px] ${directOnly ? "bg-white/18 text-white" : "bg-white text-graphite/70"}`}>
                  {directOnly ? "ON" : "OFF"}
                </span>
              </button>
              {relationStats.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => toggleRelationType(item.type)}
                  className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 text-xs font-black transition ${
                    item.active ? "bg-white text-graphite shadow-sm" : "border-ink/10 bg-paper text-graphite/52"
                  }`}
                  style={{ borderColor: item.active ? item.style.color : undefined }}
                >
                  <span className="h-1.5 w-7 rounded-full" style={{ backgroundColor: item.active ? item.style.color : "#b8b0a5" }} />
                  {item.style.label}
                  <span className="rounded bg-paper px-1.5 py-0.5 text-[10px] text-graphite/70">{item.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="h-[62vh] min-h-[460px] overflow-hidden rounded border border-ink/10 bg-white shadow-soft sm:h-[68vh] sm:min-h-[560px] lg:h-[760px]">
        {visibleTricks.length ? (
          <ReactFlow
            key={mapViewKey}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView={!isCompactViewport}
            fitViewOptions={{ padding: 0.18 }}
            defaultViewport={isCompactViewport ? { x: 18, y: 32, zoom: 0.78 } : undefined}
            minZoom={isCompactViewport ? 0.34 : 0.16}
            maxZoom={isCompactViewport ? 1.35 : 1.25}
            onNodeMouseEnter={(_, node) => setActiveNodeId(node.id)}
            onNodeMouseLeave={() => setActiveNodeId(null)}
            onNodeClick={(_, node) => setActiveNodeId(node.id)}
          >
            <Background color="#d8d1c7" gap={18} />
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) => (node.data.checked ? "#24514a" : ((node.data.familyStyle as SkillNodeData["familyStyle"] | undefined)?.solid ?? "#f0c45c"))}
            />
            <Controls />
          </ReactFlow>
        ) : (
          <div className="grid h-full place-items-center bg-paper px-6 text-center">
            <div>
              <p className="text-lg font-black text-ink">該当する技がありません</p>
              <p className="mt-2 text-sm font-semibold text-graphite/68">検索語か表示範囲を少し広げてください。</p>
              <button
                type="button"
                onClick={resetMapFilters}
                className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded bg-pine px-4 text-sm font-black text-white transition hover:bg-ink"
              >
                <RotateCcw aria-hidden className="size-4" />
                表示を戻す
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function matchesTrickQuery(trick: Trick, normalizedQuery: string) {
  const searchable = [trick.name, trick.discipline, trick.family, trick.levelCategory, trick.axis, trick.takeoff, trick.landing, ...trick.aliases, ...trick.tags]
    .join(" ")
    .toLowerCase();
  return searchable.includes(normalizedQuery);
}

function SkillNode({ id, data, selected }: NodeProps<SkillTreeNode>) {
  const router = useRouter();
  const href = `/tricks/${data.slug}` as `/tricks/${string}`;
  const color = data.familyStyle;

  return (
    <div
      className="w-[206px] rounded border px-3 py-2 text-left shadow-sm transition"
      style={{
        backgroundColor: data.checked ? color.solid : color.bg,
        borderColor: selected ? "#172026" : color.border,
        boxShadow: data.checked ? `0 10px 22px ${color.solid}36` : undefined,
        color: data.checked ? "#fff" : color.text
      }}
    >
      <Handle type="target" position={Position.Left} className="!bg-pine" />
      <div className="flex items-start gap-2">
        <label className="nodrag nopan mt-0.5 grid size-6 shrink-0 cursor-pointer place-items-center rounded bg-white/90 text-pine shadow-sm">
          <input
            aria-label={`${data.name}を習得済みにする`}
            type="checkbox"
            checked={data.checked}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) => data.onToggle(id, event.target.checked)}
            className="sr-only"
          />
          {data.checked ? <CheckCircle2 aria-hidden className="size-5" /> : <Circle aria-hidden className="size-5 text-graphite/42" />}
        </label>
        <div className="min-w-0">
          <Link
            href={href}
            className="nodrag nopan block text-sm font-black leading-5 underline-offset-4 hover:underline"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              router.push(href);
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {data.name}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-black" style={{ color: color.text }}>
              Lv.{data.level}
            </span>
            <span className={`max-w-[136px] truncate text-[10px] font-bold ${data.checked ? "text-white/80" : "text-graphite/68"}`}>
              {data.discipline} / {data.family}
            </span>
            {data.checked ? <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-black text-white">習得</span> : null}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-coral" />
    </div>
  );
}
