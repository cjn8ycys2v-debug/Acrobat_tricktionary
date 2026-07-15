import Link from "next/link";
import { ArrowUpRight, BookOpenText, CheckCircle2, Clock, GitBranch, ShieldAlert, Waypoints } from "lucide-react";
import type { Trick } from "@/lib/types";
import { MetricDots } from "@/components/MetricDots";

export function TrickCard({ trick, returnHref }: { trick: Trick; returnHref?: string }) {
  const detailHref =
    returnHref && returnHref !== "/tricks"
      ? { pathname: `/tricks/${trick.slug}` as `/tricks/${string}`, query: { from: returnHref } }
      : (`/tricks/${trick.slug}` as `/tricks/${string}`);
  const mapHref = { pathname: "/map" as const, query: { trick: trick.slug } };
  const hasOriginMemo = trick.tags.includes("由来メモあり");
  const knowledgeLabel = {
    draft: "未補強",
    reviewing: "監修中",
    reviewed: "監修済み"
  }[trick.knowledgeStatus];

  return (
    <article className="group flex h-full flex-col rounded border border-ink/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-pine/40 hover:shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded bg-skywash px-2 py-1 text-xs font-bold text-pine">Lv.{trick.level}</span>
            <span className="max-w-full rounded bg-ink px-2 py-1 text-xs font-bold text-white">{trick.discipline}</span>
            <span className="max-w-full rounded bg-saffron/18 px-2 py-1 text-xs font-bold text-graphite">{trick.family}</span>
          </div>
          <h2 className="break-words text-lg font-bold leading-tight text-ink">{trick.name}</h2>
          {trick.aliases.length ? (
            <p className="mt-1 text-xs font-bold leading-5 text-graphite/58">
              別名: {trick.aliases.slice(0, 3).join(" / ")}
            </p>
          ) : null}
        </div>
        <Link
          href={detailHref}
          className="grid size-9 shrink-0 place-items-center rounded border border-ink/10 text-pine transition group-hover:bg-pine group-hover:text-white"
          aria-label={`${trick.name}の詳細`}
        >
          <ArrowUpRight aria-hidden className="size-4" />
        </Link>
      </div>
      <p className="mt-3 flex-1 text-sm leading-6 text-graphite/76">{trick.summary}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {hasOriginMemo ? (
          <span className="inline-flex max-w-full items-center gap-1.5 rounded border border-pine/18 bg-skywash px-2 py-1 text-[11px] font-black text-pine">
            <BookOpenText aria-hidden className="size-3.5 shrink-0" />
            由来メモ
          </span>
        ) : null}
        <span
          className={`inline-flex max-w-full items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-black ${
            trick.knowledgeStatus === "reviewed"
              ? "border-pine/22 bg-skywash text-pine"
              : trick.knowledgeStatus === "reviewing"
                ? "border-saffron/45 bg-saffron/14 text-graphite"
                : "border-ink/10 bg-paper text-graphite/62"
          }`}
        >
          {trick.knowledgeStatus === "reviewed" ? <CheckCircle2 aria-hidden className="size-3.5 shrink-0" /> : <Clock aria-hidden className="size-3.5 shrink-0" />}
          {knowledgeLabel}
        </span>
      </div>
      <div className="mt-4 grid gap-2 border-t border-ink/8 pt-4">
        <MetricDots label="難度" value={trick.difficulty} />
        <MetricDots label="危険度" value={trick.riskLevel} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex max-w-full items-center gap-1 rounded bg-ink/6 px-2 py-1 text-xs font-semibold text-graphite">
          <Waypoints aria-hidden className="size-3" />
          <span className="break-words">{trick.axis}</span>
        </span>
        <span className="inline-flex max-w-full items-center gap-1 rounded bg-ink/6 px-2 py-1 text-xs font-semibold text-graphite">
          <ShieldAlert aria-hidden className="size-3" />
          <span className="break-words">{trick.ropeContext}</span>
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-ink/8 pt-4">
        <Link
          href={detailHref}
          className="inline-flex h-9 items-center justify-center gap-2 rounded border border-ink/10 px-2 text-xs font-black text-graphite transition hover:border-pine hover:text-pine"
        >
          詳細
          <ArrowUpRight aria-hidden className="size-3.5" />
        </Link>
        <Link
          href={mapHref}
          className="inline-flex h-9 items-center justify-center gap-2 rounded bg-pine px-2 text-xs font-black text-white transition hover:bg-ink"
        >
          <GitBranch aria-hidden className="size-3.5" />
          相関図
        </Link>
      </div>
    </article>
  );
}
