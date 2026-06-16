"use client";

import { useMemo, useState } from "react";
import { GitBranch, Save, Wand2 } from "lucide-react";
import type { RelationType, Trick, TrickRelation } from "@/lib/types";
import { relationLabel } from "@/lib/utils";

type Props = {
  tricks: Trick[];
  relations: TrickRelation[];
  onRelationsChange: (relations: TrickRelation[]) => void;
  prototypeMode: boolean;
};

const allValue = "all";

const relationTypes: RelationType[] = ["prerequisite", "progression", "variation", "combo"];

export function RelationBulkEditor({ tricks, relations, onRelationsChange, prototypeMode }: Props) {
  const trickById = useMemo(() => new Map(tricks.map((trick) => [trick.id, trick])), [tricks]);
  const trickByName = useMemo(() => new Map(tricks.map((trick) => [trick.name, trick])), [tricks]);
  const families = useMemo(() => Array.from(new Set(tricks.map((trick) => trick.family))).sort((a, b) => a.localeCompare(b, "ja")), [tricks]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(allValue);
  const [familyFilter, setFamilyFilter] = useState<string>(allValue);
  const [relationText, setRelationText] = useState(() => exportRelations(relations, trickById));
  const [message, setMessage] = useState("現在の繋がりを一覧で確認し、テキストでまとめて指示できます。");

  const visibleRelations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return relations.filter((relation) => {
      const from = trickById.get(relation.fromTrickId);
      const to = trickById.get(relation.toTrickId);
      if (!from || !to) return false;
      const haystack = `${from.name} ${to.name} ${from.family} ${to.family} ${relation.note} ${relationLabel(relation.type)}`.toLowerCase();
      return (
        (!normalizedQuery || haystack.includes(normalizedQuery)) &&
        (typeFilter === allValue || relation.type === typeFilter) &&
        (familyFilter === allValue || from.family === familyFilter || to.family === familyFilter)
      );
    });
  }, [familyFilter, query, relations, trickById, typeFilter]);

  const typeCounts = relationTypes.map((type) => ({
    type,
    count: relations.filter((relation) => relation.type === type).length
  }));

  function syncTextFromCurrent() {
    setRelationText(exportRelations(relations, trickById));
    setMessage("現在の繋がりをテキスト欄へ反映しました。");
  }

  function applyText() {
    const result = parseRelations(relationText, trickByName);
    if (result.errors.length) {
      setMessage(`反映できない行があります: ${result.errors.slice(0, 4).join(" / ")}`);
      return;
    }
    onRelationsChange(result.relations);
    setMessage(`${result.relations.length}本の繋がりを画面上に反映しました。保存するとDBへ反映します。`);
  }

  async function saveRelations() {
    if (prototypeMode) {
      setMessage("prototype保存: 画面上の相関に反映済みです。Supabase接続後はDBへ保存します。");
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
    setMessage(response.ok ? `DBへ保存しました: ${result.relations ?? relations.length}本` : `保存に失敗しました: ${result.error ?? "unknown error"}`);
  }

  return (
    <section className="rounded border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black text-ink">
            <GitBranch aria-hidden className="size-4 text-pine" />
            現在の繋がり・一括指示
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-graphite/76">
            書式: 元の技 -&gt; 次の技 | 種類 | 強さ | メモ。種類は 前提 / 派生 / 変化 / 連携 を使えます。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {typeCounts.map((item) => (
            <span key={item.type} className="rounded border border-ink/10 bg-paper px-3 py-1.5 text-xs font-black text-graphite">
              {relationLabel(item.type)} {item.count}
            </span>
          ))}
        </div>
      </div>

      <p className="mb-3 rounded bg-paper px-3 py-2 text-xs font-semibold text-graphite/72">{message}</p>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_150px_180px]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="技名・メモで検索"
              className="h-10 rounded border border-ink/14 bg-paper px-3 text-sm outline-none focus:border-pine"
            />
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-10 rounded border border-ink/14 bg-paper px-3 text-sm font-bold outline-none focus:border-pine"
            >
              <option value={allValue}>全種類</option>
              {relationTypes.map((type) => (
                <option key={type} value={type}>
                  {relationLabel(type)}
                </option>
              ))}
            </select>
            <select
              value={familyFilter}
              onChange={(event) => setFamilyFilter(event.target.value)}
              className="h-10 rounded border border-ink/14 bg-paper px-3 text-sm font-bold outline-none focus:border-pine"
            >
              <option value={allValue}>全分野</option>
              {families.map((family) => (
                <option key={family} value={family}>
                  {family}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-[520px] overflow-auto rounded border border-ink/10 bg-paper p-2">
            {visibleRelations.length ? (
              visibleRelations.map((relation) => {
                const from = trickById.get(relation.fromTrickId);
                const to = trickById.get(relation.toTrickId);
                if (!from || !to) return null;
                return (
                  <div key={relation.id} className="mb-2 rounded border border-ink/8 bg-white p-3 last:mb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-skywash px-2 py-1 text-xs font-black text-pine">{relationLabel(relation.type)}</span>
                      <span className="rounded bg-saffron/18 px-2 py-1 text-xs font-black text-graphite">強さ {relation.strength}</span>
                    </div>
                    <p className="mt-2 text-sm font-black leading-6 text-ink">
                      {from.name} <span className="text-coral">→</span> {to.name}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-graphite/70">{relation.note || "メモなし"}</p>
                  </div>
                );
              })
            ) : (
              <p className="p-3 text-sm text-graphite/70">条件に合う繋がりはありません。</p>
            )}
          </div>
        </div>

        <div className="grid gap-3">
          <textarea
            value={relationText}
            onChange={(event) => setRelationText(event.target.value)}
            className="min-h-[460px] w-full rounded border border-ink/14 bg-paper px-3 py-2 font-mono text-xs leading-5 outline-none focus:border-pine"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={syncTextFromCurrent}
              className="inline-flex h-10 items-center justify-center gap-2 rounded border border-ink/14 px-3 text-sm font-black text-graphite transition hover:border-pine hover:text-pine"
            >
              <Wand2 aria-hidden className="size-4" />
              現在値を反映
            </button>
            <button
              type="button"
              onClick={applyText}
              className="inline-flex h-10 items-center justify-center gap-2 rounded border border-pine px-3 text-sm font-black text-pine transition hover:bg-pine hover:text-white"
            >
              画面に反映
            </button>
            <button
              type="button"
              onClick={saveRelations}
              className="inline-flex h-10 items-center justify-center gap-2 rounded bg-pine px-4 text-sm font-black text-white transition hover:bg-ink"
            >
              <Save aria-hidden className="size-4" />
              DB保存
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function exportRelations(relations: TrickRelation[], trickById: Map<string, Trick>) {
  return relations
    .map((relation) => {
      const from = trickById.get(relation.fromTrickId)?.name ?? relation.fromTrickId;
      const to = trickById.get(relation.toTrickId)?.name ?? relation.toTrickId;
      return `${from} -> ${to} | ${relationLabel(relation.type)} | ${relation.strength} | ${relation.note}`;
    })
    .join("\n");
}

function parseRelations(text: string, trickByName: Map<string, Trick>) {
  const errors: string[] = [];
  const relationByKey = new Map<string, TrickRelation>();

  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .forEach((line, index) => {
      const parts = line.split("|").map((part) => part.trim());
      const endpoints = parseEndpoints(parts[0]);
      if (!endpoints) {
        errors.push(`${index + 1}行目: 矢印が必要です`);
        return;
      }

      const from = trickByName.get(endpoints[0]);
      const to = trickByName.get(endpoints[1]);
      if (!from || !to) {
        errors.push(`${index + 1}行目: 技名が見つかりません`);
        return;
      }
      if (from.id === to.id) {
        errors.push(`${index + 1}行目: 同じ技同士は繋げません`);
        return;
      }

      const type = parseRelationType(parts[1]);
      let strength: 1 | 2 | 3 | 4 | 5 = 3;
      let noteStartIndex = 2;
      if (parts[2] && /\d/.test(parts[2])) {
        strength = Math.max(1, Math.min(5, Number(parts[2].match(/\d/)?.[0] ?? 3))) as 1 | 2 | 3 | 4 | 5;
        noteStartIndex = 3;
      }
      const note = parts.slice(noteStartIndex).join(" | ") || "管理画面で一括指定";
      const key = `${from.id}\u0000${to.id}\u0000${type}`;

      relationByKey.set(key, {
        id: `draft-${from.id}-${to.id}-${type}`,
        fromTrickId: from.id,
        toTrickId: to.id,
        type,
        note,
        strength
      });
    });

  return { relations: Array.from(relationByKey.values()), errors };
}

function parseRelationType(value: string | undefined): RelationType {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "前提" || normalized === "prerequisite" || normalized === "base") return "prerequisite";
  if (normalized === "変化" || normalized === "variation" || normalized === "similar") return "variation";
  if (normalized === "連携" || normalized === "combo" || normalized === "link") return "combo";
  return "progression";
}

function parseEndpoints(value: string | undefined) {
  if (!value) return null;
  const spacedMatch = value.match(/\s+(?:->|→|=>)\s+/);
  if (spacedMatch?.index !== undefined) {
    return [value.slice(0, spacedMatch.index).trim(), value.slice(spacedMatch.index + spacedMatch[0].length).trim()];
  }

  for (const marker of ["->", "=>"]) {
    const index = value.indexOf(marker);
    if (index > -1) {
      return [value.slice(0, index).trim(), value.slice(index + marker.length).trim()];
    }
  }

  return null;
}
