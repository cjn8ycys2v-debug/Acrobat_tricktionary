"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, Compass, Filter, GitBranch, Map, Search, ShieldAlert, SlidersHorizontal, Waypoints, X } from "lucide-react";
import type { Trick } from "@/lib/types";
import { TrickCard } from "@/components/TrickCard";
import { disciplineDescriptions, disciplineGuides, familyGuides } from "@/lib/taxonomy";

type FilterOptions = {
  disciplines: string[];
  families: string[];
  axes: string[];
  takeoffs: string[];
  landings: string[];
  ropeContexts: string[];
  tags: string[];
};

type Props = {
  tricks: Trick[];
  options: FilterOptions;
};

const allValue = "all";

type PresetCriteria = Partial<Pick<Trick, "discipline" | "family" | "ropeContext">> & {
  tag?: string;
};

export function TrickExplorer({ tricks, options }: Props) {
  const [query, setQuery] = useState("");
  const [discipline, setDiscipline] = useState(allValue);
  const [family, setFamily] = useState(allValue);
  const [axis, setAxis] = useState(allValue);
  const [ropeContext, setRopeContext] = useState(allValue);
  const [difficulty, setDifficulty] = useState(allValue);
  const [risk, setRisk] = useState(allValue);
  const [tag, setTag] = useState(allValue);
  const [sort, setSort] = useState("level");
  const [urlReady, setUrlReady] = useState(false);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tricks
      .filter((trick) => {
        const haystack = [
          trick.name,
          ...trick.aliases,
          trick.summary,
          trick.description,
          trick.originNote,
          ...trick.practiceSteps,
          ...trick.commonMistakes,
          ...trick.safetyNotes,
          trick.coachComment,
          trick.knowledgeReviewedBy,
          ...trick.knowledgeSourceUrls,
          trick.discipline,
          trick.family,
          trick.axis,
          trick.takeoff,
          trick.landing,
          trick.ropeContext,
          trick.levelCategory,
          ...trick.tags
        ]
          .join(" ")
          .toLowerCase();

        return (
          (!normalizedQuery || haystack.includes(normalizedQuery)) &&
          (discipline === allValue || trick.discipline === discipline) &&
          (family === allValue || trick.family === family) &&
          (axis === allValue || trick.axis === axis) &&
          (ropeContext === allValue || trick.ropeContext === ropeContext) &&
          (difficulty === allValue || String(trick.difficulty) === difficulty) &&
          (risk === allValue || String(trick.riskLevel) === risk) &&
          (tag === allValue || trick.tags.includes(tag))
        );
      })
      .sort((a, b) => {
        if (sort === "difficulty") return a.difficulty - b.difficulty || a.level - b.level;
        if (sort === "risk") return a.riskLevel - b.riskLevel || a.level - b.level;
        if (sort === "name") return a.name.localeCompare(b.name, "ja");
        return a.level - b.level || a.name.localeCompare(b.name, "ja");
      });
  }, [axis, difficulty, discipline, family, query, risk, ropeContext, sort, tag, tricks]);

  const disciplineStats = useMemo(
    () =>
      options.disciplines.map((item) => ({
        name: item,
        count: tricks.filter((trick) => trick.discipline === item).length,
        description: disciplineGuides[item]?.summary ?? disciplineDescriptions[item] ?? "分類ごとに技をまとめて探索できます。"
      })),
    [options.disciplines, tricks]
  );

  const familyStats = useMemo(
    () =>
      options.families.map((item) => ({
        name: item,
        count: tricks.filter((trick) => trick.family === item).length,
        guide: familyGuides[item]
      })),
    [options.families, tricks]
  );

  const activeFamilyGuide = family !== allValue ? familyGuides[family] : undefined;

  const explorationPresets = useMemo(
    () => {
      const presets: Array<{
        label: string;
        description: string;
        icon: typeof Activity;
        criteria: PresetCriteria;
      }> = [
        {
          label: "縄内アップから",
          description: "まず縄の中で体を慣らす低負荷の動き",
          icon: Activity,
          criteria: { ropeContext: "縄内アップ" }
        },
        {
          label: "床・倒立を固める",
          description: "手支持、受け身、体幹を作る前提技",
          icon: ShieldAlert,
          criteria: { family: "倒立・床基礎" }
        },
        {
          label: "反発と接続",
          description: "側転、ロンダート、バク転へつながる流れ",
          icon: GitBranch,
          criteria: { family: "側方・反発" }
        },
        {
          label: "空中系へ進む",
          description: "高さ、回転、着地を段階的に確認する技",
          icon: Compass,
          criteria: { family: "空中回転" }
        },
        {
          label: "ひねりを探す",
          description: "目線、肩、着地方向を作る発展技",
          icon: Waypoints,
          criteria: { family: "ひねり" }
        }
      ];

      return presets.map((preset) => ({
        ...preset,
        count: tricks.filter((trick) => matchesPreset(trick, preset.criteria)).length
      }));
    },
    [tricks]
  );

  const activePresetLabel = explorationPresets.find((preset) => {
    const criteria = preset.criteria;
    return (
      (criteria.discipline ?? allValue) === discipline &&
      (criteria.family ?? allValue) === family &&
      (criteria.ropeContext ?? allValue) === ropeContext &&
      (criteria.tag ?? allValue) === tag
    );
  })?.label;

  const hasFilters = Boolean(
    query ||
      discipline !== allValue ||
      family !== allValue ||
      axis !== allValue ||
      ropeContext !== allValue ||
      difficulty !== allValue ||
      risk !== allValue ||
      tag !== allValue
  );
  const mapHref = makeMapHref({ query, discipline, family });
  const explorerSearch = useMemo(
    () => makeExplorerSearch({ query, discipline, family, axis, ropeContext, difficulty, risk, tag, sort }),
    [axis, difficulty, discipline, family, query, risk, ropeContext, sort, tag]
  );
  const returnHref = explorerSearch ? `/tricks?${explorerSearch}` : "/tricks";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextDiscipline = readOption(params, "discipline", options.disciplines);
    const nextFamily = readOption(params, "family", options.families);
    const nextAxis = readOption(params, "axis", options.axes);
    const nextRopeContext = readOption(params, "rope", options.ropeContexts);
    const nextDifficulty = readOption(params, "difficulty", ["1", "2", "3", "4", "5"]);
    const nextRisk = readOption(params, "risk", ["1", "2", "3", "4", "5"]);
    const nextTag = readOption(params, "tag", options.tags);
    const nextSort = readOption(params, "sort", ["level", "difficulty", "risk", "name"], "level");

    setQuery((params.get("q") ?? "").trim());
    setDiscipline(nextDiscipline);
    setFamily(nextFamily);
    setAxis(nextAxis);
    setRopeContext(nextRopeContext);
    setDifficulty(nextDifficulty);
    setRisk(nextRisk);
    setTag(nextTag);
    setSort(nextSort);
    setUrlReady(true);
  }, [options.axes, options.disciplines, options.families, options.ropeContexts, options.tags]);

  useEffect(() => {
    if (!urlReady) return;
    const nextPath = explorerSearch ? `/tricks?${explorerSearch}` : "/tricks";
    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (currentPath !== nextPath) window.history.replaceState(null, "", nextPath);
  }, [explorerSearch, urlReady]);

  function resetFilters() {
    setQuery("");
    setDiscipline(allValue);
    setFamily(allValue);
    setAxis(allValue);
    setRopeContext(allValue);
    setDifficulty(allValue);
    setRisk(allValue);
    setTag(allValue);
    setSort("level");
  }

  function applyPreset(criteria: PresetCriteria) {
    setQuery("");
    setDiscipline(criteria.discipline ?? allValue);
    setFamily(criteria.family ?? allValue);
    setAxis(allValue);
    setRopeContext(criteria.ropeContext ?? allValue);
    setDifficulty(allValue);
    setRisk(allValue);
    setTag(criteria.tag ?? allValue);
    setSort("level");
  }

  return (
    <section className="mx-auto max-w-7xl px-3 pb-14 sm:px-6 sm:pb-16 lg:px-8">
      <div className="-mt-10 rounded border border-ink/10 bg-white p-3 shadow-soft sm:-mt-14 sm:p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <label className="flex-1">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
              <Search aria-hidden className="size-4 text-pine" />
              技名・別名・タグ・分類で検索
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="例: ロンダート / roundoff / ひねり"
              className="h-12 w-full rounded border border-ink/14 bg-paper px-4 text-base outline-none ring-pine/20 transition placeholder:text-graphite/45 focus:border-pine focus:ring-4"
            />
          </label>
          <Select label="大分類" value={discipline} onChange={setDiscipline} values={options.disciplines} />
          <Select label="系統" value={family} onChange={setFamily} values={options.families} />
          <Select label="軸" value={axis} onChange={setAxis} values={options.axes} />
          <Select label="縄文脈" value={ropeContext} onChange={setRopeContext} values={options.ropeContexts} />
          <Select label="難度" value={difficulty} onChange={setDifficulty} values={["1", "2", "3", "4", "5"]} />
          <Select label="危険度" value={risk} onChange={setRisk} values={["1", "2", "3", "4", "5"]} />
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-ink/8 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-sm font-bold text-graphite">
              <Filter aria-hidden className="size-4 text-coral" />
              タグ
            </span>
            <select
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              className="h-10 max-w-full rounded border border-ink/14 bg-white px-3 text-sm font-semibold outline-none focus:border-pine"
            >
              <option value={allValue}>すべて</option>
              {options.tags.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="inline-flex items-center gap-2 text-sm font-bold text-graphite">
              <SlidersHorizontal aria-hidden className="size-4 text-pine" />
              並び
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="h-10 rounded border border-ink/14 bg-white px-3 text-sm font-semibold outline-none focus:border-pine"
              >
                <option value="level">レベル順</option>
                <option value="difficulty">難度順</option>
                <option value="risk">危険度順</option>
                <option value="name">五十音順</option>
              </select>
            </label>
            {hasFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded border border-ink/12 px-3 text-sm font-bold text-graphite transition hover:bg-ink hover:text-white sm:w-auto"
              >
                <X aria-hidden className="size-4" />
                解除
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black text-ink">目的から探す</p>
            <p className="text-xs leading-5 text-graphite/64">練習の入り口、床作り、反発、空中、ひねりの順に入口を分けました。</p>
          </div>
          {activePresetLabel ? <p className="text-xs font-black text-pine">選択中: {activePresetLabel}</p> : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {explorationPresets.map((preset) => {
            const Icon = preset.icon;
            const isActive = activePresetLabel === preset.label;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.criteria)}
                className={`min-h-[112px] rounded border p-3 text-left transition ${
                  isActive ? "border-coral bg-coral/8 text-coral shadow-sm" : "border-ink/10 bg-white text-ink hover:border-coral/45 hover:bg-coral/5"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <Icon aria-hidden className="size-4 shrink-0" />
                  <span className="rounded bg-paper px-2 py-0.5 text-[11px] font-black text-graphite">{preset.count} 技</span>
                </span>
                <span className="mt-2 block text-sm font-black leading-5">{preset.label}</span>
                <span className="mt-1.5 block text-xs font-semibold leading-5 text-graphite/70">{preset.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black text-ink">分野から探す</p>
            <p className="text-xs leading-5 text-graphite/64">まず動きの出どころで絞ると、相関図でも流れを追いやすくなります。</p>
          </div>
          {discipline !== allValue ? (
            <button
              type="button"
              onClick={() => setDiscipline(allValue)}
              className="inline-flex h-9 w-full items-center justify-center rounded border border-ink/12 px-3 text-xs font-black text-graphite transition hover:bg-ink hover:text-white sm:w-auto"
            >
              全分野に戻す
            </button>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {disciplineStats.map((item) => {
            const isActive = discipline === item.name;
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => setDiscipline(item.name)}
                className={`min-h-[118px] rounded border p-4 text-left transition ${
                  isActive ? "border-pine bg-pine text-white shadow-soft" : "border-ink/10 bg-white text-ink hover:border-pine/45 hover:bg-skywash"
                }`}
              >
                <span className={`text-xs font-black ${isActive ? "text-white/70" : "text-pine"}`}>{item.count} 技</span>
                <span className="mt-1 block text-lg font-black">{item.name}</span>
                <span className={`mt-2 block text-sm leading-6 ${isActive ? "text-white/78" : "text-graphite/70"}`}>{item.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black text-ink">系統から読む</p>
            <p className="text-xs leading-5 text-graphite/64">同じ分野でも、支える技・反発する技・空中で見せる技では練習順が変わります。</p>
          </div>
          {family !== allValue ? (
            <button
              type="button"
              onClick={() => setFamily(allValue)}
              className="inline-flex h-9 w-full items-center justify-center rounded border border-ink/12 px-3 text-xs font-black text-graphite transition hover:bg-ink hover:text-white sm:w-auto"
            >
              全系統に戻す
            </button>
          ) : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {familyStats.map((item) => {
            const isActive = family === item.name;
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => setFamily(item.name)}
                className={`min-h-[116px] rounded border p-3 text-left transition ${
                  isActive ? "border-saffron bg-saffron/14 text-ink shadow-sm" : "border-ink/10 bg-white text-ink hover:border-saffron/60 hover:bg-saffron/8"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-black">{item.name}</span>
                  <span className="rounded bg-paper px-2 py-0.5 text-[11px] font-black text-graphite">{item.count} 技</span>
                </span>
                <span className="mt-2 block text-xs font-semibold leading-5 text-graphite/72">
                  {item.guide?.summary ?? "近い身体操作の技をまとめた系統です。"}
                </span>
              </button>
            );
          })}
        </div>
        {activeFamilyGuide ? (
          <div className="mt-3 grid gap-2 rounded border border-ink/10 bg-paper p-3 sm:grid-cols-3">
            <GuideNote label="体の見方" value={activeFamilyGuide.bodyFocus} />
            <GuideNote label="縄内での使い方" value={activeFamilyGuide.ropeUse} />
            <GuideNote label="探し方" value={activeFamilyGuide.searchHint} />
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <p className="text-sm font-semibold text-graphite/72">
            {filtered.length} / {tricks.length} 技
          </p>
          <p className="mt-1 text-xs text-graphite/62">安全な環境と補助者のもとで段階的に練習してください。</p>
        </div>
        <Link
          href={mapHref}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-pine px-3 text-sm font-black text-white transition hover:bg-ink sm:w-auto"
        >
          <Map aria-hidden className="size-4" />
          この条件を相関図で見る
        </Link>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((trick) => (
          <TrickCard key={trick.id} trick={trick} returnHref={returnHref} />
        ))}
      </div>

      {!filtered.length ? (
        <div className="mt-8 rounded border border-dashed border-ink/20 bg-white p-8 text-center text-graphite">
          条件に合う技がありません。検索語やフィルタを少しゆるめてください。
        </div>
      ) : null}
    </section>
  );
}

function matchesPreset(trick: Trick, criteria: PresetCriteria) {
  return (
    (!criteria.discipline || trick.discipline === criteria.discipline) &&
    (!criteria.family || trick.family === criteria.family) &&
    (!criteria.ropeContext || trick.ropeContext === criteria.ropeContext) &&
    (!criteria.tag || trick.tags.includes(criteria.tag))
  );
}

function makeMapHref({ query, discipline, family }: { query: string; discipline: string; family: string }) {
  const params: Record<string, string> = {};
  const normalizedQuery = query.trim();
  if (normalizedQuery) params.q = normalizedQuery;
  if (discipline !== allValue) params.discipline = discipline;
  if (family !== allValue) params.family = family;
  return Object.keys(params).length ? { pathname: "/map", query: params } : { pathname: "/map" };
}

function makeExplorerSearch({
  query,
  discipline,
  family,
  axis,
  ropeContext,
  difficulty,
  risk,
  tag,
  sort
}: {
  query: string;
  discipline: string;
  family: string;
  axis: string;
  ropeContext: string;
  difficulty: string;
  risk: string;
  tag: string;
  sort: string;
}) {
  const params = new URLSearchParams();
  const normalizedQuery = query.trim();
  if (normalizedQuery) params.set("q", normalizedQuery);
  if (discipline !== allValue) params.set("discipline", discipline);
  if (family !== allValue) params.set("family", family);
  if (axis !== allValue) params.set("axis", axis);
  if (ropeContext !== allValue) params.set("rope", ropeContext);
  if (difficulty !== allValue) params.set("difficulty", difficulty);
  if (risk !== allValue) params.set("risk", risk);
  if (tag !== allValue) params.set("tag", tag);
  if (sort !== "level") params.set("sort", sort);
  return params.toString();
}

function readOption(params: URLSearchParams, key: string, values: string[], fallback = allValue) {
  const value = params.get(key) ?? "";
  if (!value) return fallback;
  return values.includes(value) ? value : fallback;
}

function Select({
  label,
  value,
  values,
  onChange
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="w-full min-w-0 lg:w-auto lg:min-w-[132px]">
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded border border-ink/14 bg-paper px-3 text-sm font-semibold outline-none focus:border-pine"
      >
        <option value={allValue}>すべて</option>
        {values.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function GuideNote({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white p-3">
      <p className="text-[11px] font-black text-pine">{label}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-graphite/76">{value}</p>
    </div>
  );
}
