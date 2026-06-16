import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GitBranch, PlayCircle, ShieldAlert } from "lucide-react";
import { MetricDots } from "@/components/MetricDots";
import { allTricks } from "@/lib/atlas";
import { getPublicAtlasContent } from "@/lib/repository";
import type { Trick, TrickRelation } from "@/lib/types";
import { relationLabel } from "@/lib/utils";

export function generateStaticParams() {
  return allTricks.map((trick) => ({ slug: trick.slug }));
}

export default async function TrickDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const atlas = await getPublicAtlasContent();
  const trick = atlas.tricks.find((candidate) => candidate.slug === slug);
  if (!trick) notFound();

  const incoming = atlas.relations.filter((relation) => relation.toTrickId === trick.id);
  const outgoing = atlas.relations.filter((relation) => relation.fromTrickId === trick.id);
  const mediaAssets = atlas.mediaAssets.filter((asset) => asset.trickId === trick.id && asset.type === "video");
  const primaryVideo = mediaAssets[0];
  const source = trick.showSource ? atlas.sources.find((item) => item.id === trick.sourceId) : undefined;

  return (
    <main className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Link href="/tricks" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-pine hover:text-coral">
        <ArrowLeft aria-hidden className="size-4" />
        技図鑑に戻る
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <section className="rounded border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded bg-pine px-3 py-1 text-sm font-black text-white">Lv.{trick.level}</span>
            <span className="rounded bg-saffron/18 px-3 py-1 text-sm font-bold text-graphite">{trick.levelCategory}</span>
            <span className="rounded bg-skywash px-3 py-1 text-sm font-bold text-pine">{trick.family}</span>
          </div>
          <h1 className="break-words text-3xl font-black tracking-normal text-ink sm:text-4xl">{trick.name}</h1>
          <p className="mt-4 text-base leading-7 text-graphite/80 sm:text-lg sm:leading-8">{trick.summary}</p>
          <div className="mt-5 grid gap-4 border-y border-ink/8 py-5 sm:mt-6 sm:grid-cols-2">
            <MetricDots label="難度" value={trick.difficulty} />
            <MetricDots label="危険度" value={trick.riskLevel} />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Info label="軸" value={trick.axis} />
            <Info label="踏切" value={trick.takeoff} />
            <Info label="着地" value={trick.landing} />
            <Info label="縄文脈" value={trick.ropeContext} />
          </div>
          <p className="mt-6 leading-8 text-graphite">{trick.description}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {trick.tags.map((tag) => (
              <span key={tag} className="rounded bg-paper px-2.5 py-1 text-xs font-bold text-graphite">
                {tag}
              </span>
            ))}
          </div>
          {source ? (
            <p className="mt-5 text-xs text-graphite/60">
              出典: {source.title}
            </p>
          ) : null}
        </section>

        <aside className="grid gap-4 sm:gap-5">
          <section className="rounded border border-ink/10 bg-ink p-4 text-white shadow-sm sm:p-5">
            {primaryVideo ? (
              <video
                controls
                className="aspect-video w-full rounded border border-white/14 bg-black"
                src={videoSrc(primaryVideo.storagePath)}
              />
            ) : (
              <div className="grid aspect-video place-items-center rounded border border-white/14 bg-white/8">
                <div className="text-center">
                  <PlayCircle aria-hidden className="mx-auto mb-3 size-12 text-saffron" />
                  <p className="text-sm font-bold">動画は管理画面から追加</p>
                  <p className="mt-2 text-xs leading-5 text-white/62">Supabase Storageのtrick-mediaバケットに保存します。</p>
                </div>
              </div>
            )}
          </section>

          <section className="rounded border border-coral/22 bg-coral/8 p-4 sm:p-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-black text-ink">
              <ShieldAlert aria-hidden className="size-4 text-coral" />
              安全メモ
            </h2>
            <p className="text-sm leading-6 text-graphite/78">
              高さ・回転・着地を伴う技は、補助者、マット、段階練習を前提にしてください。危険度は目安であり、個人差があります。
            </p>
          </section>

          <RelationList title="前提・似ている技" relations={incoming} direction="incoming" tricks={atlas.tricks} />
          <RelationList title="次に練習する技" relations={outgoing} direction="outgoing" tricks={atlas.tricks} />
        </aside>
      </div>
    </main>
  );
}

function videoSrc(storagePath: string) {
  if (/^https?:\/\//.test(storagePath)) return storagePath;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return storagePath;
  return `${supabaseUrl}/storage/v1/object/public/trick-media/${storagePath}`;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-paper p-3">
      <p className="text-xs font-bold text-graphite/58">{label}</p>
      <p className="mt-1 font-black text-ink">{value}</p>
    </div>
  );
}

function RelationList({
  title,
  relations,
  direction,
  tricks
}: {
  title: string;
  relations: TrickRelation[];
  direction: "incoming" | "outgoing";
  tricks: Trick[];
}) {
  return (
    <section className="rounded border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-ink">
        <GitBranch aria-hidden className="size-4 text-pine" />
        {title}
      </h2>
      <div className="grid gap-2">
        {relations.length ? (
          relations.map((relation) => {
            const related = tricks.find((candidate) => candidate.id === (direction === "incoming" ? relation.fromTrickId : relation.toTrickId));
            if (!related) return null;
            return (
              <Link key={relation.id} href={`/tricks/${related.slug}`} className="rounded border border-ink/8 bg-paper p-3 transition hover:border-pine hover:bg-skywash">
                <span className="block text-sm font-black text-ink">{related.name}</span>
                <span className="mt-1 block text-xs font-bold text-pine">{relationLabel(relation.type)} / 強さ {relation.strength}</span>
                <span className="mt-1 block text-xs leading-5 text-graphite/68">{relation.note}</span>
              </Link>
            );
          })
        ) : (
          <p className="rounded bg-paper p-3 text-sm text-graphite/70">登録された相関はまだありません。</p>
        )}
      </div>
    </section>
  );
}
