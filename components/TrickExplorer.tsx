"use client";

import { useMemo, useState } from "react";
import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import type { Trick } from "@/lib/types";
import { TrickCard } from "@/components/TrickCard";

type FilterOptions = {
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

export function TrickExplorer({ tricks, options }: Props) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState(allValue);
  const [axis, setAxis] = useState(allValue);
  const [difficulty, setDifficulty] = useState(allValue);
  const [risk, setRisk] = useState(allValue);
  const [tag, setTag] = useState(allValue);
  const [sort, setSort] = useState("level");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tricks
      .filter((trick) => {
        const haystack = [trick.name, ...trick.aliases, trick.summary, trick.family, trick.axis, ...trick.tags]
          .join(" ")
          .toLowerCase();

        return (
          (!normalizedQuery || haystack.includes(normalizedQuery)) &&
          (family === allValue || trick.family === family) &&
          (axis === allValue || trick.axis === axis) &&
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
  }, [axis, difficulty, family, query, risk, sort, tag, tricks]);

  const hasFilters = Boolean(query || family !== allValue || axis !== allValue || difficulty !== allValue || risk !== allValue || tag !== allValue);

  function resetFilters() {
    setQuery("");
    setFamily(allValue);
    setAxis(allValue);
    setDifficulty(allValue);
    setRisk(allValue);
    setTag(allValue);
    setSort("level");
  }

  return (
    <section className="mx-auto max-w-7xl px-3 pb-14 sm:px-6 sm:pb-16 lg:px-8">
      <div className="-mt-10 rounded border border-ink/10 bg-white p-3 shadow-soft sm:-mt-14 sm:p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <label className="flex-1">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
              <Search aria-hidden className="size-4 text-pine" />
              技名・タグ・分類で検索
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="例: ロンダート / ひねり / 空中系"
              className="h-12 w-full rounded border border-ink/14 bg-paper px-4 text-base outline-none ring-pine/20 transition placeholder:text-graphite/45 focus:border-pine focus:ring-4"
            />
          </label>
          <Select label="系統" value={family} onChange={setFamily} values={options.families} />
          <Select label="軸" value={axis} onChange={setAxis} values={options.axes} />
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

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-sm font-semibold text-graphite/72">
          {filtered.length} / {tricks.length} 技
        </p>
        <p className="text-xs text-graphite/62">安全な環境と補助者のもとで段階的に練習してください。</p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((trick) => (
          <TrickCard key={trick.id} trick={trick} />
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
