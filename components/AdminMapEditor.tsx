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
import { GitBranch, MousePointer2, RotateCcw, Save } from "lucide-react";
import { makeDirectSkillTreeRelations, makeLevelColumnLayoutMap } from "@/lib/map-layout";
import { sortFamilies } from "@/lib/taxonomy";
import type { RelationType, Trick, TrickMapPosition, TrickRelation } from "@/lib/types";
import { relationLabel } from "@/lib/utils";

const editorLayoutStorageKey = "dd-acro-editor-map-layout-v2";

const edgeColors: Record<RelationType, string> = {
  prerequisite: "#24514a",
  progression: "#d76147",
  variation: "#4f83c4",
  combo: "#8a5bbf"
};

const familyColors = ["#24514a", "#d76147", "#317aa3", "#8a5bbf", "#c48a1b", "#bf3f6f", "#455a64", "#6b7f2a"];

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

  const trickById = useMemo(() => new Map(tricks.map((trick) => [trick.id, trick])), [tricks]);
  const visibleTricks = useMemo(() => {
    const ids = new Set<string>();
    for (const relation of relations) {
      ids.add(relation.fromTrickId);
      ids.add(relation.toTrickId);
    }
    return tricks.filter((trick) => ids.has(trick.id));
  }, [relations, tricks]);
  const visibleRelations = useMemo(() => makeDirectSkillTreeRelations(relations, visibleTricks), [relations, visibleTricks]);

  const familyByName = useMemo(() => {
    const families = sortFamilies(Array.from(new Set(visibleTricks.map((trick) => trick.family))));
    return new Map(families.map((family, index) => [family, familyColors[index % familyColors.length]]));
  }, [visibleTricks]);

  const autoNodes = useMemo(() => makeNodes(visibleTricks, visibleRelations, mapPositions, familyByName), [familyByName, mapPositions, visibleRelations, visibleTricks]);

  const edges: Edge[] = useMemo(
    () =>
      visibleRelations
        .filter((relation) => trickById.has(relation.fromTrickId) && trickById.has(relation.toTrickId))
        .map((relation) => ({
          id: relation.id,
          source: relation.fromTrickId,
          target: relation.toTrickId,
          type: "smoothstep",
          label: relationLabel(relation.type),
          markerEnd: { type: MarkerType.ArrowClosed, color: edgeColors[relation.type] },
          style: { stroke: edgeColors[relation.type], strokeWidth: 2.2 },
          labelStyle: { fontWeight: 800, fill: "#2d3035" },
          labelBgPadding: [6, 3],
          labelBgBorderRadius: 6,
          labelBgStyle: { fill: "#fffaf0", fillOpacity: 0.96 }
        })),
    [trickById, visibleRelations]
  );

  useEffect(() => {
    if (prototypeMode) {
      const stored = readStoredPositions();
      if (stored.length) {
        setNodes(makeNodes(visibleTricks, visibleRelations, stored, familyByName));
        return;
      }
    }
    setNodes(autoNodes);
  }, [autoNodes, familyByName, prototypeMode, visibleRelations, visibleTricks]);

  useEffect(() => {
    setLayoutText(exportLayout(nodes, trickById));
  }, [nodes, trickById]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      const deletedIds = new Set(deletedEdges.map((edge) => edge.id));
      onRelationsChange(relations.filter((relation) => !deletedIds.has(relation.id)));
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
        strength: 3
      };
      onRelationsChange([...relations, relation]);
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
          strength: relation.strength
        }))
      })
    });
    const result = await response.json();
    setMessage(response.ok ? `線をDBへ保存しました: ${result.relations ?? relations.length}本` : `線の保存に失敗しました: ${result.error ?? "unknown error"}`);
  }

  function resetAutoLayout() {
    setNodes(makeNodes(visibleTricks, visibleRelations, [], familyByName));
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

      setNodes(makeNodes(visibleTricks, visibleRelations, positionsFromText, familyByName));
      setMessage(`JSONから${positionsFromText.length}件の配置を反映しました。`);
    } catch {
      setMessage("JSONの形式を確認してください。");
    }
  }

  return (
    <section className="rounded border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black text-ink">
            <GitBranch aria-hidden className="size-4 text-pine" />
            公式スキルツリー配置
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-graphite/76">
            編集者用です。カードはドラッグ、右端から左端へ線を引くと前提・派生を追加できます。線は選択してDelete/Backspaceで削除できます。
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <label className="inline-flex h-10 items-center gap-2 rounded border border-ink/14 bg-paper px-3 text-xs font-black text-graphite">
            追加する線
            <select
              value={newRelationType}
              onChange={(event) => setNewRelationType(event.target.value as RelationType)}
              className="h-8 rounded border border-ink/10 bg-white px-2 text-xs font-black outline-none focus:border-pine"
            >
              {(["progression", "prerequisite"] as RelationType[]).map((type) => (
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
            onNodesChange={onNodesChange}
            onConnect={onConnect}
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
          width: 222,
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
