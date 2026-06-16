import { Activity, GitBranch, ListChecks, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TrickExplorer } from "@/components/TrickExplorer";
import { getFeaturedTricks } from "@/lib/atlas";
import { getPublicAtlasContent } from "@/lib/repository";

export default async function TricksPage() {
  const atlas = await getPublicAtlasContent();
  const published = atlas.tricks.filter((trick) => trick.status === "published");
  const seedFeaturedNames = new Set(getFeaturedTricks().map((trick) => trick.name));
  const featured = published.filter((trick) => seedFeaturedNames.has(trick.name)).slice(0, 6);

  return (
    <main>
      <section className="hero-image">
        <div className="mx-auto flex min-h-[340px] max-w-7xl flex-col justify-end px-3 pb-16 pt-10 sm:min-h-[380px] sm:px-6 sm:pb-20 sm:pt-14 lg:px-8">
          <div className="max-w-3xl text-white">
            <div className="mb-4 inline-flex items-center gap-2 rounded bg-white/16 px-3 py-1 text-sm font-bold backdrop-blur">
              <Activity aria-hidden className="size-4" />
              Double Dutch Acro Atlas
            </div>
            <h1 className="text-3xl font-black leading-tight tracking-normal sm:text-5xl lg:text-6xl">
              <span className="block sm:inline">ダブルダッチ・</span>
              <span className="block sm:inline">アクロ技図鑑</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/88 sm:text-lg">
              技名、分類、難度、危険度、前提技から探せる競技者向けの図鑑です。相関図と検索を行き来しながら、練習順を組み立てられます。
            </p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 text-white sm:mt-8 sm:grid-cols-4">
            <Metric icon={Activity} label="収録技" value={`${published.length}`} />
            <Metric icon={ListChecks} label="レベル" value={`${atlas.levels.length}`} />
            <Metric icon={GitBranch} label="相関" value={`${atlas.relations.length}`} />
            <Metric icon={ShieldAlert} label="Safety" value="段階練習" />
          </div>
        </div>
      </section>
      <TrickExplorer tricks={published} options={atlas.options} />
      <section className="mx-auto max-w-7xl px-3 pb-14 sm:px-6 sm:pb-16 lg:px-8">
        <div className="rounded border border-ink/10 bg-ink p-4 text-white sm:p-5">
          <p className="mb-3 text-sm font-bold text-saffron">Featured</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((trick) => (
              <div key={trick.id} className="rounded bg-white/8 p-4">
                <p className="text-lg font-black">{trick.name}</p>
                <p className="mt-2 text-sm leading-6 text-white/74">{trick.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded border border-white/20 bg-white/12 p-3 backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase text-white/68">{label}</span>
        <Icon aria-hidden className="size-4 text-saffron" />
      </div>
      <span className="text-2xl font-black">{value}</span>
    </div>
  );
}
