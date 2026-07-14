import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  ClipboardList,
  ExternalLink,
  GitBranch,
  Lightbulb,
  PlayCircle,
  Route,
  ShieldAlert,
  TriangleAlert,
  type LucideIcon
} from "lucide-react";
import type { ReactNode } from "react";
import { MasteryToggle } from "@/components/MasteryToggle";
import { MetricDots } from "@/components/MetricDots";
import { allTricks } from "@/lib/atlas";
import { formatSeconds, isLikelyDirectVideoPath, videoSrc, youtubeEmbedSrc } from "@/lib/media";
import { getPublicAtlasContent } from "@/lib/repository";
import { disciplineGuides, familyGuides, type TaxonomyGuide } from "@/lib/taxonomy";
import type { MediaAsset, Trick, TrickRelation } from "@/lib/types";
import { relationLabel } from "@/lib/utils";

export function generateStaticParams() {
  return allTricks.map((trick) => ({ slug: trick.slug }));
}

export default async function TrickDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const atlas = await getPublicAtlasContent();
  const trick = atlas.tricks.find((candidate) => candidate.slug === slug);
  if (!trick) notFound();

  const incoming = atlas.relations.filter((relation) => relation.toTrickId === trick.id);
  const outgoing = atlas.relations.filter((relation) => relation.fromTrickId === trick.id);
  const learningIncoming = incoming.filter(isLearningRelation);
  const learningOutgoing = outgoing.filter(isLearningRelation);
  const mediaAssets = atlas.mediaAssets.filter((asset) => asset.trickId === trick.id && asset.type === "video");
  const primaryVideo = mediaAssets.find((asset) => asset.storagePath.trim() && asset.consentChecked);
  const source = trick.showSource ? atlas.sources.find((item) => item.id === trick.sourceId) : undefined;
  const disciplineGuide = disciplineGuides[trick.discipline];
  const familyGuide = familyGuides[trick.family];

  return (
    <main className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Link href="/tricks" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-pine hover:text-coral">
        <ArrowLeft aria-hidden className="size-4" />
        技図鑑に戻る
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <section className="min-w-0 rounded border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded bg-pine px-3 py-1 text-sm font-black text-white">Lv.{trick.level}</span>
            <span className="rounded bg-saffron/18 px-3 py-1 text-sm font-bold text-graphite">{trick.levelCategory}</span>
            <span className="rounded bg-ink px-3 py-1 text-sm font-bold text-white">{trick.discipline}</span>
            <span className="rounded bg-skywash px-3 py-1 text-sm font-bold text-pine">{trick.family}</span>
          </div>
          <h1 className="break-words text-3xl font-black tracking-normal text-ink sm:text-4xl">{trick.name}</h1>
          {trick.aliases.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {trick.aliases.map((alias) => (
                <span key={alias} className="max-w-full shrink-0 break-all rounded border border-ink/10 bg-paper px-2.5 py-1 text-xs font-black text-graphite">
                  別名: {alias}
                </span>
              ))}
            </div>
          ) : null}
          <p className="mt-4 text-base leading-7 text-graphite/80 sm:text-lg sm:leading-8">{trick.summary}</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href={`/map?trick=${encodeURIComponent(trick.slug)}`}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-pine px-4 text-sm font-black text-white transition hover:bg-ink sm:w-auto"
            >
              <GitBranch aria-hidden className="size-4" />
              相関図で見る
            </Link>
            <MasteryToggle trickId={trick.id} trickName={trick.name} />
          </div>
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
          <LearningRoute trick={trick} incoming={learningIncoming} outgoing={learningOutgoing} tricks={atlas.tricks} />
          <p className="mt-6 leading-8 text-graphite">{trick.description}</p>
          {(disciplineGuide || familyGuide) ? (
            <div className="mt-7 grid gap-3 border-t border-ink/8 pt-6 sm:grid-cols-2">
              {disciplineGuide ? <TaxonomyGuideBlock title={`${trick.discipline}として見る`} guide={disciplineGuide} /> : null}
              {familyGuide ? <TaxonomyGuideBlock title={`${trick.family}として見る`} guide={familyGuide} /> : null}
            </div>
          ) : null}
          <div className="mt-7 border-t border-ink/8 pt-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-black text-ink">
              <BookOpenText aria-hidden className="size-5 text-pine" />
              図鑑メモ
            </h2>
            <KnowledgeReviewBadge trick={trick} />
            <div className="grid gap-5">
              {trick.originNote ? (
                <KnowledgeBlock icon={Lightbulb} title="発祥・由来" tone="pine">
                  <p className="text-sm leading-7 text-graphite/82">{trick.originNote}</p>
                </KnowledgeBlock>
              ) : null}
              <KnowledgeList icon={ClipboardList} title="練習ステップ" items={trick.practiceSteps} tone="saffron" />
              <KnowledgeList icon={TriangleAlert} title="よくある失敗" items={trick.commonMistakes} tone="coral" />
              <KnowledgeList icon={ShieldAlert} title="安全注意" items={trick.safetyNotes} tone="ink" />
              {trick.coachComment ? (
                <KnowledgeBlock icon={BookOpenText} title="監修者コメント" tone="graphite">
                  <p className="text-sm leading-7 text-graphite/82">{trick.coachComment}</p>
                </KnowledgeBlock>
              ) : null}
              {trick.showKnowledgeSources && trick.knowledgeSourceUrls.length ? (
                <KnowledgeSources urls={trick.knowledgeSourceUrls} />
              ) : null}
            </div>
          </div>
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

        <aside className="grid min-w-0 gap-4 sm:gap-5">
          <section className="rounded border border-ink/10 bg-ink p-4 text-white shadow-sm sm:p-5">
            {primaryVideo ? (
              <VideoPanel asset={primaryVideo} />
            ) : (
              <div className="grid aspect-video place-items-center rounded border border-white/14 bg-white/8">
                <div className="text-center">
                  <PlayCircle aria-hidden className="mx-auto mb-3 size-12 text-saffron" />
                  <p className="text-sm font-bold">動画は管理画面から追加</p>
                  <p className="mt-2 text-xs leading-5 text-white/62">公開用URLまたはStorage動画を登録すると表示されます。</p>
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

function LearningRoute({
  trick,
  incoming,
  outgoing,
  tricks
}: {
  trick: Trick;
  incoming: TrickRelation[];
  outgoing: TrickRelation[];
  tricks: Trick[];
}) {
  const before = pickRouteTricks(incoming, "incoming", tricks);
  const after = pickRouteTricks(outgoing, "outgoing", tricks);
  if (!before.length && !after.length) return null;

  return (
    <section className="mt-6 rounded border border-pine/18 bg-skywash p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-sm font-black text-ink">
          <Route aria-hidden className="size-4 text-pine" />
          練習ルート
        </h2>
        <Link
          href={`/map?trick=${encodeURIComponent(trick.slug)}`}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded border border-pine/25 bg-white px-2.5 text-xs font-black text-pine transition hover:bg-pine hover:text-white"
        >
          全体を見る
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
        <RouteColumn label="先に確認" empty="前提技は未登録です" items={before} />
        <RouteArrow />
        <div className="rounded border border-ink/12 bg-white p-3">
          <p className="text-[11px] font-black text-pine">今の技</p>
          <p className="mt-1 text-base font-black leading-6 text-ink">{trick.name}</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-graphite/68">
            Lv.{trick.level} / {trick.family} / {trick.ropeContext}
          </p>
        </div>
        <RouteArrow />
        <RouteColumn label="次候補" empty="派生技は未登録です" items={after} />
      </div>
    </section>
  );
}

function RouteColumn({ label, empty, items }: { label: string; empty: string; items: RouteItem[] }) {
  return (
    <div className="rounded border border-ink/10 bg-white p-3">
      <p className="text-[11px] font-black text-graphite/58">{label}</p>
      <div className="mt-2 grid gap-2">
        {items.length ? (
          items.map((item) => (
            <Link
              key={`${label}-${item.relation.id}`}
              href={`/tricks/${item.trick.slug}`}
              className="rounded border border-ink/8 bg-paper px-3 py-2 transition hover:border-pine hover:bg-skywash"
            >
              <span className="block text-sm font-black leading-5 text-ink">{item.trick.name}</span>
              <span className="mt-1 block text-[11px] font-bold text-pine">
                {relationLabel(item.relation.type)} / 強さ {item.relation.strength}
              </span>
            </Link>
          ))
        ) : (
          <p className="rounded bg-paper px-3 py-2 text-xs font-semibold leading-5 text-graphite/64">{empty}</p>
        )}
      </div>
    </div>
  );
}

function RouteArrow() {
  return (
    <div className="hidden place-items-center text-pine md:grid">
      <ArrowRight aria-hidden className="size-5" />
    </div>
  );
}

function TaxonomyGuideBlock({ title, guide }: { title: string; guide: TaxonomyGuide }) {
  return (
    <section className="rounded border border-ink/10 bg-paper p-4">
      <h2 className="text-sm font-black text-ink">{title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-graphite/78">{guide.summary}</p>
      <dl className="mt-3 grid gap-2 text-xs leading-5">
        <div>
          <dt className="font-black text-pine">ルーツ</dt>
          <dd className="mt-0.5 text-graphite/76">{guide.roots}</dd>
        </div>
        <div>
          <dt className="font-black text-pine">縄内での使い方</dt>
          <dd className="mt-0.5 text-graphite/76">{guide.ropeUse}</dd>
        </div>
      </dl>
    </section>
  );
}

type RouteItem = {
  relation: TrickRelation;
  trick: Trick;
};

function pickRouteTricks(relations: TrickRelation[], direction: "incoming" | "outgoing", tricks: Trick[]): RouteItem[] {
  return relations
    .map((relation) => {
      const relatedId = direction === "incoming" ? relation.fromTrickId : relation.toTrickId;
      const related = tricks.find((candidate) => candidate.id === relatedId);
      return related ? { relation, trick: related } : null;
    })
    .filter((item): item is RouteItem => Boolean(item))
    .sort((a, b) => b.relation.strength - a.relation.strength || a.trick.level - b.trick.level || a.trick.name.localeCompare(b.trick.name, "ja"))
    .slice(0, 3);
}

function isLearningRelation(relation: TrickRelation) {
  return relation.type === "prerequisite" || relation.type === "progression";
}

function KnowledgeReviewBadge({ trick }: { trick: Trick }) {
  const label = {
    draft: "下書き",
    reviewing: "監修中",
    reviewed: "監修済み"
  }[trick.knowledgeStatus];
  const message =
    trick.knowledgeStatus === "reviewed"
      ? `${trick.knowledgeReviewedBy ? `${trick.knowledgeReviewedBy} による` : ""}監修済みの知識メモです。`
      : "この知識メモは編集中です。由来や背景は監修後に更新します。";
  const className =
    trick.knowledgeStatus === "reviewed"
      ? "border-pine/25 bg-skywash text-pine"
      : trick.knowledgeStatus === "reviewing"
        ? "border-saffron/40 bg-saffron/12 text-graphite"
        : "border-ink/10 bg-paper text-graphite/76";

  return (
    <div className={`mb-5 rounded border px-3 py-2 text-xs font-bold leading-5 ${className}`}>
      <span className="mr-2 rounded bg-white/80 px-2 py-0.5 font-black">{label}</span>
      {message}
    </div>
  );
}

function KnowledgeBlock({
  icon: Icon,
  title,
  tone,
  children
}: {
  icon: LucideIcon;
  title: string;
  tone: "pine" | "saffron" | "coral" | "ink" | "graphite";
  children: ReactNode;
}) {
  const toneClass = {
    pine: "border-pine/35 text-pine",
    saffron: "border-saffron/60 text-saffron",
    coral: "border-coral/45 text-coral",
    ink: "border-ink/35 text-ink",
    graphite: "border-graphite/30 text-graphite"
  }[tone];

  return (
    <section className={`border-l-4 pl-4 ${toneClass}`}>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-ink">
        <Icon aria-hidden className="size-4" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function KnowledgeList({
  icon,
  title,
  items,
  tone
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
  tone: "pine" | "saffron" | "coral" | "ink" | "graphite";
}) {
  if (!items.length) return null;
  return (
    <KnowledgeBlock icon={icon} title={title} tone={tone}>
      <ol className="grid gap-2 text-sm leading-6 text-graphite/82">
        {items.map((item, index) => (
          <li key={`${title}-${item}`} className="grid grid-cols-[1.7rem_1fr] gap-2">
            <span className="grid size-6 place-items-center rounded bg-paper text-xs font-black text-graphite/70">{index + 1}</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </KnowledgeBlock>
  );
}

function KnowledgeSources({ urls }: { urls: string[] }) {
  return (
    <KnowledgeBlock icon={BookOpenText} title="参考リンク" tone="graphite">
      <ul className="grid gap-1.5 text-sm leading-6">
        {urls.map((url) => (
          <li key={url} className="min-w-0">
            <a href={url} target="_blank" rel="noreferrer" className="break-all font-bold text-pine underline-offset-4 hover:underline">
              {url}
            </a>
          </li>
        ))}
      </ul>
    </KnowledgeBlock>
  );
}

function VideoPanel({ asset }: { asset: MediaAsset }) {
  const meta = [
    asset.credit ? `撮影/提供: ${asset.credit}` : "",
    asset.duration !== undefined ? `動画: ${formatSeconds(asset.duration)}` : ""
  ].filter(Boolean);

  return (
    <div>
      <VideoFrame asset={asset} />
      {meta.length ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-white/72">
          {meta.map((item) => (
            <span key={item} className="rounded border border-white/14 bg-white/8 px-2 py-1">
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function VideoFrame({ asset }: { asset: MediaAsset }) {
  const youtubeSrc = youtubeEmbedSrc(asset.storagePath);
  if (youtubeSrc) {
    return (
      <iframe
        className="aspect-video w-full rounded border border-white/14 bg-black"
        src={youtubeSrc}
        title="お手本動画"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  if (!isLikelyDirectVideoPath(asset.storagePath)) {
    return (
      <a
        href={asset.storagePath}
        target="_blank"
        rel="noreferrer"
        className="grid aspect-video place-items-center rounded border border-white/14 bg-white/8 text-center transition hover:border-saffron"
      >
        <span>
          <ExternalLink aria-hidden className="mx-auto mb-3 size-10 text-saffron" />
          <span className="text-sm font-black">動画を開く</span>
        </span>
      </a>
    );
  }

  return (
    <video
      controls
      className="aspect-video w-full rounded border border-white/14 bg-black"
      src={videoSrc(asset.storagePath)}
    />
  );
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
