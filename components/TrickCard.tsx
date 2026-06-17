import Link from "next/link";
import { ArrowUpRight, ShieldAlert, Waypoints } from "lucide-react";
import type { Trick } from "@/lib/types";
import { MetricDots } from "@/components/MetricDots";

export function TrickCard({ trick }: { trick: Trick }) {
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
        </div>
        <Link
          href={`/tricks/${trick.slug}`}
          className="grid size-9 shrink-0 place-items-center rounded border border-ink/10 text-pine transition group-hover:bg-pine group-hover:text-white"
          aria-label={`${trick.name}の詳細`}
        >
          <ArrowUpRight aria-hidden className="size-4" />
        </Link>
      </div>
      <p className="mt-3 flex-1 text-sm leading-6 text-graphite/76">{trick.summary}</p>
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
    </article>
  );
}
