"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  applyNodeChanges,
  type Edge,
  type Node,
  type NodeChange,
  type Connection
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GitBranch, ListTree, MousePointer2, Plus, RotateCcw, Save, Search, Trash2 } from "lucide-react";
import { RouteEdge, type RouteEdgeData } from "@/components/RouteEdge";
import { makeDirectSkillTreeRelations, makeLevelColumnLayoutMap } from "@/lib/map-layout";
import { sortFamilies } from "@/lib/taxonomy";
import type { RelationType, RelationWaypoint, Trick, TrickMapPosition, TrickRelation } from "@/lib/types";
import { relationLabel } from "@/lib/utils";

const editorLayoutStorageKey = "dd-acro-editor-map-layout-v2";

const edgeColors: Record<RelationType, string> = {
  prerequisite: "#24514a",
  progression: "#d76147",
  variation: "#4f83c4",
  combo: "#8a5bbf"
};

const familyColors = ["#24514a", "#d76147", "#317aa3", "#8a5bbf", "#c48a1b", "#bf3f6f", "#455a64", "#6b7f2a"];
const adminNodeWidth = 222;
const adminNodeCenterY = 40;
const relationTypeOptions: RelationType[] = ["prerequisite", "progression", "variation", "combo"];

const edgeTypes = {
  route: RouteEdge
};

type Props = {
  tricks: Trick[];
  relations: TrickRelation[];
  mapPositions: TrickMapPosition[];
  prototypeMode: boolean;
  onRelationsChange: (relations: TrickRelation[]) => void;
};

export function AdminMapEditor({ tricks, relations, mapPositions, prototypeMode, onRelationsChange }: Props) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [message, setMessage] = useState("カードをドラッグして、編集者用の公式配置を作れます。");
  const [layoutText, setLayoutText] = useState("");
  const [newRelationType, setNewRelationType] = useState<RelationType>("progression");
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [relationQuery, setRelationQuery] = useState("");
  const [relationDisplayMode, setRelationDisplayMode] = useState<"direct" | "all">("direct");

  const trickById = useMemo(() => new Map(tricks.map((trick) => [trick.id, trick])), [tricks]);
  const visibleTricks = useMemo(() => {
    const ids = new Set<string>();
    for (const relation of relations) {
      ids.add(relation.fromTrickId);
      ids.add(relation.toTrickId);
    }
    return tricks.filter((trick) => ids.has(trick.id));
  }, [relations, tricks]);
  const validRelations = useMemo(
    () => relations.filter((relation) => trickById.has(relation.fromTrickId) && trickById.has(relation.toTrickId)),
    [relations, trickById]
  );
  const directRelations = useMemo(() => makeDirectSkillTreeRelations(validRelations, visibleTricks), [validRelations, visibleTricks]);
  const visibleRelations = relationDisplayMode === "all" ? validRelations : directRelations;
  const editableRelations = useMemo(
    () => visibleRelations.filter((relation) => trickById.has(relation.fromTrickId) && trickById.has(relation.toTrickId)),
    [trickById, visibleRelations]
  );

  const familyByName = useMemo(() => {
    const families = sortFamilies(Array.from(new Set(visibleTricks.map((trick) => trick.family))));
    return new Map(families.map((family, index) => [family, familyColors[index % familyColors.length]]));
  }, [visibleTricks]);

  const autoNodes = useMemo(() => makeNodes(visibleTricks, directRelations, mapPositions, familyByName), [directRelations, familyByName, mapPositions, visibleTricks]);

  const updateRelationWaypoints = useCallback(
    (relationId: string, updater: (waypoints: RelationWaypoint[]) => RelationWaypoint[]) => {
      onRelationsChange(
        relations.map((relation) =>
          relation.id === relationId
            ? {
                ...relation,
                waypoints: updater(relation.waypoints ?? []).map(snapWaypoint)
              }
            : relation
        )
      );
    },
    [onRelationsChange, relations]
  );

  const updateWaypoint = useCallback(
    (relationId: string, index: number, point: RelationWaypoint) => {
      updateRelationWaypoints(relationId, (waypoints) => waypoints.map((waypoint, waypointIndex) => (waypointIndex === index ? point : waypoint)));
    },
    [updateRelationWaypoints]
  );

  const deleteWaypoint = useCallback(
    (relationId: string, index: number) => {
      updateRelationWaypoints(relationId, (waypoints) => waypoints.filter((_, waypointIndex) => waypointIndex !== index));
      setMessage("中継点を削除しました。DBに反映するには「線を保存」を押してください。");
    },
    [updateRelationWaypoints]
  );

  const edges: Edge[] = useMemo(
    () =>
      editableRelations.map((relation) => ({
          id: relation.id,
          source: relation.fromTrickId,
          target: relation.toTrickId,
          type: "route",
          markerEnd: { type: MarkerType.ArrowClosed, color: edgeColors[relation.type] },
          data: {
            label: relationLabel(relation.type),
            color: edgeColors[relation.type],
            active: selectedEdgeId === relation.id,
            editable: selectedEdgeId === relation.id,
            waypoints: relation.waypoints,
            onWaypointChange: updateWaypoint,
            onWaypointDelete: deleteWaypoint
          } satisfies RouteEdgeData
        })),
    [deleteWaypoint, editableRelations, selectedEdgeId, updateWaypoint]
  );

  useEffect(() => {
    if (prototypeMode) {
      const stored = readStoredPositions();
      if (stored.length) {
        setNodes(makeNodes(visibleTricks, directRelations, stored, familyByName));
        return;
      }
    }
    setNodes(autoNodes);
  }, [autoNodes, directRelations, familyByName, prototypeMode, visibleTricks]);

  useEffect(() => {
    setLayoutText(exportLayout(nodes, trickById));
  }, [nodes, trickById]);

  useEffect(() => {
    if (selectedEdgeId && !visibleRelations.some((relation) => relation.id === selectedEdgeId)) {
      setSelectedEdgeId(null);
    }
  }, [selectedEdgeId, visibleRelations]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      const deletedIds = new Set(deletedEdges.map((edge) => edge.id));
      onRelationsChange(relations.filter((relation) => !deletedIds.has(relation.id)));
      setSelectedEdgeId((current) => (current && deletedIds.has(current) ? null : current));
      setMessage(`${deletedEdges.length}本の線を削除しました。DBに反映するには「線を保存」を押してください。`);
    },
    [onRelationsChange, relations]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || connection.source === connection.target) {
        setMessage("同じ技同士は繋げません。");
        return;
      }
      const exists = relations.some((relation) => relation.fromTrickId === connection.source && relation.toTrickId === connection.target && relation.type === newRelationType);
      if (exists) {
        setMessage("同じ向き・同じ種類の線はすでにあります。");
        return;
      }

      const relation: TrickRelation = {
        id: `draft-${connection.source}-${connection.target}-${newRelationType}-${Date.now()}`,
        fromTrickId: connection.source,
        toTrickId: connection.target,
        type: newRelationType,
        note: "配置タブで追加",
        strength: 3,
        waypoints: []
      };
      onRelationsChange([...relations, relation]);
      setSelectedEdgeId(relation.id);
      setRelationDisplayMode("all");
      const from = trickById.get(connection.source)?.name ?? "元の技";
      const to = trickById.get(connection.target)?.name ?? "次の技";
      setMessage(`${from} → ${to} を${relationLabel(newRelationType)}として追加しました。DBに反映するには「線を保存」を押してください。`);
    },
    [newRelationType, onRelationsChange, relations, trickById]
  );

  const positions = useMemo(
    () =>
      nodes.map((node) => ({
        trickId: node.id,
        x: Math.round(node.position.x),
        y: Math.round(node.position.y)
      })),
    [nodes]
  );

  const selectedRelation = useMemo(() => relations.find((relation) => relation.id === selectedEdgeId) ?? null, [relations, selectedEdgeId]);

  function addWaypointToSelected() {
    if (!selectedRelation) {
      setMessage("先に編集したい線をクリックしてください。");
      return;
    }

    const sourceNode = nodes.find((node) => node.id === selectedRelation.fromTrickId);
    const targetNode = nodes.find((node) => node.id === selectedRelation.toTrickId);
    const sourceAnchor = sourceNode ? { x: sourceNode.position.x + adminNodeWidth, y: sourceNode.position.y + adminNodeCenterY } : { x: 0, y: 0 };
    const targetAnchor = targetNode ? { x: targetNode.position.x, y: targetNode.position.y + adminNodeCenterY } : { x: sourceAnchor.x + 260, y: sourceAnchor.y };

    updateRelationWaypoints(selectedRelation.id, (waypoints) => {
      const start = waypoints[waypoints.length - 1] ?? sourceAnchor;
      return [...waypoints, midpoint(start, targetAnchor)];
    });
    setMessage("中継点を追加しました。丸をドラッグすると線の通り道を調整できます。");
  }

  function updateSelectedRelation(patch: Partial<Pick<TrickRelation, "type" | "note" | "strength">>) {
    if (!selectedRelation) {
      setMessage("先に編集したい線をクリックしてください。");
      return;
    }

    if (patch.type) {
      const duplicated = relations.some(
        (relation) =>
          relation.id !== selectedRelation.id &&
          relation.fromTrickId === selectedRelation.fromTrickId &&
          relation.toTrickId === selectedRelation.toTrickId &&
          relation.type === patch.type
      );
      if (duplicated) {
        setMessage("同じ向き・同じ種類の線がすでにあります。");
        return;
      }
    }

    onRelationsChange(
      relations.map((relation) =>
        relation.id === selectedRelation.id
          ? {
              ...relation,
              ...patch,
              strength: patch.strength ? normalizeStrength(patch.strength) : relation.strength
            }
          : relation
      )
    );
    setMessage("線の内容を更新しました。DBに反映するには「線を保存」を押してください。");
  }

  function deleteSelectedRelation() {
    if (!selectedRelation) {
      setMessage("先に削除したい線をクリックしてください。");
      return;
    }
    onRelationsChange(relations.filter((relation) => relation.id !== selectedRelation.id));
    setSelectedEdgeId(null);
    setMessage(`${selectedFromName} → ${selectedToName} の線を削除しました。DBに反映するには「線を保存」を押してください。`);
  }

  function clearSelectedWaypoints() {
    if (!selectedRelation) {
      setMessage("先に編集したい線をクリックしてください。");
      return;
    }

    updateRelationWaypoints(selectedRelation.id, () => []);
    setMessage("選択中の線の中継点を全削除しました。DBに反映するには「線を保存」を押してください。");
  }

  async function saveLayout() {
    if (prototypeMode) {
      window.localStorage.setItem(editorLayoutStorageKey, JSON.stringify(positions));
      setMessage("prototype保存: このブラウザの公開相関図プレビューに公式配置として反映しました。");
      return;
    }

    const response = await fetch("/api/admin/map-layout", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ positions })
    });
    const result = await response.json();
    setMessage(response.ok ? `公式配置を保存しました: ${result.positions ?? positions.length}件` : `保存に失敗しました: ${result.error ?? "unknown error"}`);
  }

  async function saveRelations() {
    if (prototypeMode) {
      setMessage("prototype保存: 画面上の線に反映済みです。Supabase接続後はDBへ保存します。");
      return;
    }

    const response = await fetch("/api/admin/relations", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        relations: relations.map((relation) => ({
          fromTrickId: relation.fromTrickId,
          toTrickId: relation.toTrickId,
          type: relation.type,
          note: relation.note,
          strength: relation.strength,
          waypoints: relation.waypoints
        }))
      })
    });
    const result = await response.json();
    setMessage(response.ok ? `線をDBへ保存しました: ${result.relations ?? relations.length}本` : `線の保存に失敗しました: ${result.error ?? "unknown error"}`);
  }

  function resetAutoLayout() {
    setNodes(makeNodes(visibleTricks, directRelations, [], familyByName));
    setMessage("自動整列に戻しました。保存すると公式配置として反映されます。");
  }

  function applyLayoutText() {
    try {
      const parsed = JSON.parse(layoutText) as Array<{ name?: string; trickId?: string; x: number; y: number }>;
      const byName = new Map(visibleTricks.map((trick) => [trick.name, trick]));
      const byId = new Map(visibleTricks.map((trick) => [trick.id, trick]));
      const positionsFromText = parsed
        .map((item) => {
          const trick = item.trickId ? byId.get(item.trickId) : item.name ? byName.get(item.name) : undefined;
          if (!trick || !Number.isFinite(item.x) || !Number.isFinite(item.y)) return null;
          return { trickId: trick.id, x: Math.round(item.x), y: Math.round(item.y) };
        })
        .filter((position): position is TrickMapPosition => Boolean(position));

      if (!positionsFromText.length) {
        setMessage("JSONから有効な配置を読み取れませんでした。");
        return;
      }

      setNodes(makeNodes(visibleTricks, directRelations, positionsFromText, familyByName));
      setMessage(`JSONから${positionsFromText.length}件の配置を反映しました。`);
    } catch {
      setMessage("JSONの形式を確認してください。");
    }
  }

  const selectedFromName = selectedRelation ? (trickById.get(selectedRelation.fromTrickId)?.name ?? selectedRelation.fromTrickId) : "";
  const selectedToName = selectedRelation ? (trickById.get(selectedRelation.toTrickId)?.name ?? selectedRelation.toTrickId) : "";
  const filteredEditableRelations = useMemo(() => {
    const normalized = relationQuery.trim().toLowerCase();
    if (!normalized) return editableRelations;
    return editableRelations.filter((relation) => {
      const from = trickById.get(relation.fromTrickId);
      const to = trickById.get(relation.toTrickId);
      const haystack = [
        from?.name,
        to?.name,
        from?.family,
        to?.family,
        relationLabel(relation.type),
        relation.note,
        relation.waypoints.length ? `中継点${relation.waypoints.length}` : "中継点0"
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [editableRelations, relationQuery, trickById]);

  return (
    <section className="rounded border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black text-ink">
            <GitBranch aria-hidden className="size-4 text-pine" />
            公式スキルツリー配置
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-graphite/76">
            編集者用です。カードはドラッグ、右端から左端へ線を引くと前提・派生を追加できます。線をクリックすると通り道の中継点も編集できます。
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <label className="inline-flex h-10 items-center gap-2 rounded border border-ink/14 bg-paper px-3 text-xs font-black text-graphite">
            表示する線
            <select
              value={relationDisplayMode}
              onChange={(event) => setRelationDisplayMode(event.target.value as "direct" | "all")}
              className="h-8 rounded border border-ink/10 bg-white px-2 text-xs font-black outline-none focus:border-pine"
            >
              <option value="direct">整理済み</option>
              <option value="all">全て</option>
            </select>
          </label>
          <label className="inline-flex h-10 items-center gap-2 rounded border border-ink/14 bg-paper px-3 text-xs font-black text-graphite">
            追加する線
            <select
              value={newRelationType}
              onChange={(event) => setNewRelationType(event.target.value as RelationType)}
              className="h-8 rounded border border-ink/10 bg-white px-2 text-xs font-black outline-none focus:border-pine"
            >
              {relationTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {relationLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={resetAutoLayout}
            className="inline-flex h-10 items-center justify-center gap-2 rounded border border-ink/14 px-3 text-sm font-black text-graphite transition hover:border-coral hover:text-coral"
          >
            <RotateCcw aria-hidden className="size-4" />
            自動整列
          </button>
          <button
            type="button"
            onClick={saveRelations}
            className="inline-flex h-10 items-center justify-center gap-2 rounded border border-pine px-3 text-sm font-black text-pine transition hover:bg-pine hover:text-white"
          >
            <MousePointer2 aria-hidden className="size-4" />
            線を保存
          </button>
          <button
            type="button"
            onClick={saveLayout}
            className="inline-flex h-10 items-center justify-center gap-2 rounded bg-pine px-4 text-sm font-black text-white transition hover:bg-ink"
          >
            <Save aria-hidden className="size-4" />
            配置を保存
          </button>
        </div>
      </div>

      <p className="mb-3 rounded bg-paper px-3 py-2 text-xs font-semibold text-graphite/72">{message}</p>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="h-[560px] overflow-hidden rounded border border-ink/10 bg-paper sm:h-[660px]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onConnect={onConnect}
            onEdgeClick={(_, edge) => {
              setSelectedEdgeId(edge.id);
              setMessage("線を選択しました。中継点を追加して、丸をドラッグすると通り道を調整できます。");
            }}
            onPaneClick={() => setSelectedEdgeId(null)}
            onEdgesDelete={onEdgesDelete}
            deleteKeyCode={["Backspace", "Delete"]}
            fitView
            snapToGrid
            snapGrid={[20, 20]}
            connectionLineStyle={{ stroke: edgeColors[newRelationType], strokeWidth: 3 }}
            fitViewOptions={{ padding: 0.16 }}
            minZoom={0.16}
            maxZoom={1.4}
          >
            <Background color="#d8d1c7" gap={20} />
            <MiniMap pannable zoomable nodeColor={(node) => String(node.style?.borderColor ?? "#24514a")} />
            <Controls />
          </ReactFlow>
        </div>

        <div className="grid gap-3">
          <div className="rounded border border-ink/10 bg-paper p-3">
            <p className="text-xs font-black text-graphite/62">線の手動編集</p>
            {selectedRelation ? (
              <div className="mt-2">
                <p className="text-sm font-black leading-5 text-ink">
                  {selectedFromName} → {selectedToName}
                </p>
                <p className="mt-1 text-xs font-semibold text-graphite/68">
                  {relationLabel(selectedRelation.type)} / 中継点 {selectedRelation.waypoints.length}個
                </p>
                <div className="mt-3 grid gap-2">
                  <label className="text-[10px] font-black text-graphite/58">
                    種類
                    <select
                      value={selectedRelation.type}
                      onChange={(event) => updateSelectedRelation({ type: event.target.value as RelationType })}
                      className="mt-1 h-9 w-full rounded border border-ink/10 bg-white px-2 text-xs font-black text-ink outline-none focus:border-pine"
                    >
                      {relationTypeOptions.map((type) => (
                        <option key={type} value={type}>
                          {relationLabel(type)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[10px] font-black text-graphite/58">
                    強さ
                    <input
                      min={1}
                      max={5}
                      type="number"
                      value={selectedRelation.strength}
                      onChange={(event) => updateSelectedRelation({ strength: normalizeStrength(Number(event.target.value)) })}
                      className="mt-1 h-9 w-full rounded border border-ink/10 bg-white px-2 text-xs font-black text-ink outline-none focus:border-pine"
                    />
                  </label>
                  <label className="text-[10px] font-black text-graphite/58">
                    メモ
                    <textarea
                      value={selectedRelation.note}
                      onChange={(event) => updateSelectedRelation({ note: event.target.value })}
                      className="mt-1 min-h-16 w-full rounded border border-ink/10 bg-white px-2 py-2 text-xs font-semibold leading-5 text-ink outline-none focus:border-pine"
                    />
                  </label>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <button
                    type="button"
                    onClick={addWaypointToSelected}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded bg-pine px-3 text-sm font-black text-white transition hover:bg-ink"
                  >
                    <Plus aria-hidden className="size-4" />
                    中継点を追加
                  </button>
                  <button
                    type="button"
                    onClick={clearSelectedWaypoints}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded border border-ink/14 bg-white px-3 text-sm font-black text-graphite transition hover:border-coral hover:text-coral"
                  >
                    <Trash2 aria-hidden className="size-4" />
                    中継点を全削除
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelectedRelation}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded border border-coral/45 bg-white px-3 text-sm font-black text-coral transition hover:bg-coral hover:text-white sm:col-span-2 xl:col-span-1"
                  >
                    <Trash2 aria-hidden className="size-4" />
                    この線を削除
                  </button>
                </div>
                {selectedRelation.waypoints.length ? (
                  <div className="mt-3 grid gap-2">
                    {selectedRelation.waypoints.map((point, index) => (
                      <div key={`${selectedRelation.id}-${index}`} className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2 rounded bg-white p-2">
                        <span className="text-xs font-black text-graphite/58">{index + 1}</span>
                        <label className="min-w-0 text-[10px] font-black text-graphite/58">
                          X
                          <input
                            type="number"
                            value={Math.round(point.x)}
                            onChange={(event) => updateWaypoint(selectedRelation.id, index, { x: Number(event.target.value), y: point.y })}
                            className="mt-1 h-8 w-full rounded border border-ink/10 bg-paper px-2 text-xs font-black text-ink outline-none focus:border-pine"
                          />
                        </label>
                        <label className="min-w-0 text-[10px] font-black text-graphite/58">
                          Y
                          <input
                            type="number"
                            value={Math.round(point.y)}
                            onChange={(event) => updateWaypoint(selectedRelation.id, index, { x: point.x, y: Number(event.target.value) })}
                            className="mt-1 h-8 w-full rounded border border-ink/10 bg-paper px-2 text-xs font-black text-ink outline-none focus:border-pine"
                          />
                        </label>
                        <button
                          type="button"
                          aria-label={`中継点${index + 1}を削除`}
                          onClick={() => deleteWaypoint(selectedRelation.id, index)}
                          className="mt-4 grid size-8 place-items-center rounded border border-ink/10 bg-paper text-graphite transition hover:border-coral hover:text-coral"
                        >
                          <Trash2 aria-hidden className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded bg-white px-3 py-2 text-xs font-semibold leading-5 text-graphite/68">
                    中継点なし。追加すると線上に丸が出て、ドラッグで曲げられます。
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs font-semibold leading-5 text-graphite/68">線をクリックすると、曲げるための中継点を追加・削除できます。</p>
            )}
          </div>
          <div className="rounded border border-ink/10 bg-paper p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-black text-graphite/62">
                <ListTree aria-hidden className="size-4 text-pine" />
                表示中の線
              </p>
              <span className="rounded bg-white px-2 py-1 text-[11px] font-black text-graphite/68">
                {editableRelations.length} / {validRelations.length}本
              </span>
            </div>
            <label className="mt-3 flex h-9 items-center gap-2 rounded border border-ink/12 bg-white px-2.5 text-xs focus-within:border-pine">
              <Search aria-hidden className="size-4 shrink-0 text-graphite/42" />
              <input
                value={relationQuery}
                onChange={(event) => setRelationQuery(event.target.value)}
                placeholder="技名・系統・中継点で検索"
                className="h-full min-w-0 flex-1 bg-transparent outline-none"
              />
            </label>
            <div className="mt-3 max-h-72 overflow-auto pr-1">
              {filteredEditableRelations.length ? (
                <div className="grid gap-2">
                  {filteredEditableRelations.map((relation) => {
                    const from = trickById.get(relation.fromTrickId);
                    const to = trickById.get(relation.toTrickId);
                    const isSelected = relation.id === selectedEdgeId;
                    return (
                      <button
                        key={relation.id}
                        type="button"
                        onClick={() => {
                          setSelectedEdgeId(relation.id);
                          setMessage("線一覧から選択しました。中継点を追加して、丸をドラッグすると通り道を調整できます。");
                        }}
                        className={`w-full rounded border px-3 py-2 text-left transition ${
                          isSelected ? "border-pine bg-skywash text-pine" : "border-ink/8 bg-white text-graphite hover:border-pine"
                        }`}
                      >
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-paper px-2 py-0.5 text-[11px] font-black">{relationLabel(relation.type)}</span>
                          <span className="rounded bg-paper px-2 py-0.5 text-[11px] font-black">中継点 {relation.waypoints.length}</span>
                        </span>
                        <span className="mt-1.5 block text-xs font-black leading-5 text-ink">
                          {from?.name ?? relation.fromTrickId} <span className="text-coral">→</span> {to?.name ?? relation.toTrickId}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] font-semibold opacity-70">
                          {from?.family ?? "-"} / {to?.family ?? "-"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded bg-white px-3 py-2 text-xs font-semibold text-graphite/62">条件に合う線がありません。</p>
              )}
            </div>
          </div>
          <div className="rounded border border-ink/10 bg-paper p-3">
            <p className="text-xs font-black text-graphite/62">配置JSON</p>
            <p className="mt-1 text-xs leading-5 text-graphite/72">手で数値調整したい場合は編集して反映できます。</p>
          </div>
          <textarea
            value={layoutText}
            onChange={(event) => setLayoutText(event.target.value)}
            className="min-h-[360px] w-full rounded border border-ink/14 bg-paper px-3 py-2 font-mono text-xs leading-5 outline-none focus:border-pine"
          />
          <button
            type="button"
            onClick={applyLayoutText}
            className="inline-flex h-10 items-center justify-center rounded border border-pine px-3 text-sm font-black text-pine transition hover:bg-pine hover:text-white"
          >
            JSONから反映
          </button>
        </div>
      </div>
    </section>
  );
}

function makeNodes(tricks: Trick[], relations: TrickRelation[], positions: TrickMapPosition[], familyByName: Map<string, string>): Node[] {
  const positionById = new Map(positions.map((position) => [position.trickId, position]));
  const autoPositionById = makeLevelColumnLayoutMap(tricks, relations);

  return tricks
    .map((trick) => {
      const color = familyByName.get(trick.family) ?? "#24514a";
      const autoPosition = autoPositionById.get(trick.id) ?? { x: 0, y: 0 };
      const saved = positionById.get(trick.id);

      return {
        id: trick.id,
        type: "default",
        position: saved ? { x: saved.x, y: saved.y } : autoPosition,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: { label: `${trick.name}\nLv.${trick.level} / ${trick.discipline} / ${trick.family}` },
        style: {
          width: adminNodeWidth,
          borderColor: color,
          background: "#ffffff",
          borderWidth: 2,
          borderRadius: 6,
          color: "#172026",
          fontSize: 12,
          fontWeight: 800,
          whiteSpace: "pre-line"
        }
      } satisfies Node;
    })
    .sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
}

function exportLayout(nodes: Node[], trickById: Map<string, Trick>) {
  const rows = nodes.map((node) => ({
    name: trickById.get(node.id)?.name ?? node.id,
    trickId: node.id,
    x: Math.round(node.position.x),
    y: Math.round(node.position.y)
  }));
  return JSON.stringify(rows, null, 2);
}

function readStoredPositions(): TrickMapPosition[] {
  try {
    const raw = window.localStorage.getItem(editorLayoutStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TrickMapPosition[];
    return parsed.filter((position) => typeof position.trickId === "string" && Number.isFinite(position.x) && Number.isFinite(position.y));
  } catch {
    return [];
  }
}

function snapWaypoint(point: RelationWaypoint): RelationWaypoint {
  return {
    x: Math.round(point.x / 10) * 10,
    y: Math.round(point.y / 10) * 10
  };
}

function midpoint(start: RelationWaypoint, end: RelationWaypoint): RelationWaypoint {
  return snapWaypoint({
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2
  });
}

function normalizeStrength(value: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(1, Math.min(5, Math.round(value || 3))) as 1 | 2 | 3 | 4 | 5;
}
