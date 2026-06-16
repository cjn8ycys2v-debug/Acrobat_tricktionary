import Link from "next/link";
import { CheckCircle2, ListChecks } from "lucide-react";
import type { LevelTest, Trick } from "@/lib/types";

export function LevelBoard({ levels, tricks }: { levels: LevelTest[]; tricks: Trick[] }) {
  const trickByName = new Map(tricks.map((trick) => [trick.name, trick]));

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded bg-skywash px-3 py-1 text-sm font-bold text-pine">
            <ListChecks aria-hidden className="size-4" />
            PDF由来のレベルテスト
          </p>
          <h1 className="text-2xl font-black tracking-normal text-ink sm:text-4xl">レベルテスト表</h1>
        </div>
        <p className="max-w-xl text-sm leading-6 text-graphite/76">
          図鑑の分類とは分け、練習チェック表として扱います。Lv.1-5は倒立系、Lv.6以降は発展カテゴリです。
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {levels.map((level) => (
          <section key={level.level} className="rounded border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-pine px-2.5 py-1 text-sm font-black text-white">Lv.{level.level}</span>
                  <span className="rounded bg-saffron/18 px-2.5 py-1 text-sm font-bold text-graphite">{level.category}</span>
                </div>
                <h2 className="text-xl font-black text-ink">{level.title}</h2>
              </div>
              <span className="inline-flex w-full items-center gap-2 rounded bg-paper px-3 py-2 text-xs font-bold text-graphite sm:w-auto">
                <CheckCircle2 aria-hidden className="size-4 text-coral" />
                {level.passCondition}
              </span>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {level.trickNames.map((name) => {
                const trick = trickByName.get(name);
                return trick ? (
                  <Link
                    key={name}
                    href={`/tricks/${trick.slug}`}
                    className="rounded border border-ink/8 bg-paper px-3 py-2 text-sm font-semibold text-graphite transition hover:border-pine hover:bg-skywash hover:text-pine"
                  >
                    {name}
                  </Link>
                ) : (
                  <span key={name} className="rounded border border-ink/8 bg-paper px-3 py-2 text-sm font-semibold text-graphite">
                    {name}
                  </span>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
