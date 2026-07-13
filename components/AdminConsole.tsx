"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  ExternalLink,
  FileVideo,
  GitBranch,
  Layers,
  LinkIcon,
  Lock,
  Plus,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  type LucideIcon
} from "lucide-react";
import { AdminMapEditor } from "@/components/AdminMapEditor";
import { RelationBulkEditor } from "@/components/RelationBulkEditor";
import { formatReferenceRange, formatSeconds, isLikelyDirectVideoPath, parseTimecodeToSeconds, timedReferenceUrl, videoSrc, youtubeEmbedSrc } from "@/lib/media";
import type { LevelTest, MediaAsset, Source, Trick, TrickMapPosition, TrickRelation } from "@/lib/types";
import type { ReactNode } from "react";
import { relationLabel } from "@/lib/utils";

type Props = {
  tricks: Trick[];
  levels: LevelTest[];
  relations: TrickRelation[];
  mapPositions: TrickMapPosition[];
  mediaAssets: MediaAsset[];
  sources: Source[];
  prototypeMode: boolean;
};

type AdminSection = "tricks" | "knowledge" | "videos" | "relations" | "layout" | "status";

type KnowledgePatch = Partial<
  Pick<
    Trick,
    | "aliases"
    | "summary"
    | "description"
    | "originNote"
    | "practiceSteps"
    | "commonMistakes"
    | "safetyNotes"
    | "coachComment"
    | "knowledgeStatus"
    | "knowledgeReviewedBy"
    | "knowledgeSourceUrls"
    | "showKnowledgeSources"
  >
>;

export function AdminConsole({ tricks, levels, relations, mapPositions, mediaAssets, sources, prototypeMode }: Props) {
  const [drafts, setDrafts] = useState(tricks);
  const [relationDrafts, setRelationDrafts] = useState(relations);
  const [mediaDrafts, setMediaDrafts] = useState(mediaAssets);
  const [selectedId, setSelectedId] = useState(drafts[0]?.id ?? "");
  const [activeSection, setActiveSection] = useState<AdminSection>("tricks");
  const [knowledgeChangedIds, setKnowledgeChangedIds] = useState<Set<string>>(() => new Set());
  const [videoMessage, setVideoMessage] = useState("動画ファイルを選ぶと、種別・サイズ・同意チェックの検証を行います。");
  const [saveMessage, setSaveMessage] = useState("技名、別名、基礎技、応用技、説明、挿入動画をまとめて編集できます。");
  const [knowledgeMessage, setKnowledgeMessage] = useState("由来、説明、練習ステップ、安全注意を横断で監修できます。");
  const [relationMessage, setRelationMessage] = useState("登録済みの技から複数選択できます。選択すると相関図の線にも反映されます。");

  const selected = useMemo(() => drafts.find((trick) => trick.id === selectedId) ?? drafts[0], [drafts, selectedId]);
  const trickById = useMemo(() => new Map(drafts.map((trick) => [trick.id, trick])), [drafts]);
  const relationOptions = useMemo(
    () => (selected ? drafts.filter((trick) => trick.id !== selected.id).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "ja")) : []),
    [drafts, selected]
  );

  const selectedBaseRelations = useMemo(
    () => (selected ? relationDrafts.filter((relation) => relation.toTrickId === selected.id && isLearningRelation(relation)) : []),
    [relationDrafts, selected]
  );
  const selectedAdvancedRelations = useMemo(
    () => (selected ? relationDrafts.filter((relation) => relation.fromTrickId === selected.id && relation.type === "progression") : []),
    [relationDrafts, selected]
  );
  const selectedVideos = useMemo(
    () => (selected ? mediaDrafts.filter((asset) => asset.trickId === selected.id && asset.type === "video") : []),
    [mediaDrafts, selected]
  );

  function updateSelected<K extends keyof Trick>(field: K, value: Trick[K]) {
    if (!selected) return;
    setDrafts((current) => current.map((trick) => (trick.id === selected.id ? { ...trick, [field]: value } : trick)));
  }

  function updateKnowledgeDraft(id: string, patch: KnowledgePatch) {
    setDrafts((current) => current.map((trick) => (trick.id === id ? { ...trick, ...patch } : trick)));
    setKnowledgeChangedIds((current) => new Set(current).add(id));
    setKnowledgeMessage("未保存の知識メモがあります。必要な分だけDB保存してください。");
  }

  function makeDraftTrick(): Trick {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `draft-${Date.now()}`;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
    return {
      id,
      slug: `draft-${stamp}`,
      name: "新規下書き",
      aliases: [],
      summary: "新規下書き",
      description: "管理画面から説明を追加してください。",
      originNote: "発祥・由来は監修後に追記してください。",
      practiceSteps: [],
      commonMistakes: [],
      safetyNotes: [],
      coachComment: "",
      knowledgeStatus: "draft",
      knowledgeReviewedBy: "",
      knowledgeSourceUrls: [],
      showKnowledgeSources: false,
      difficulty: 1,
      riskLevel: 1,
      discipline: "ダブルダッチ",
      family: "未分類",
      axis: "未分類",
      takeoff: "未設定",
      landing: "未設定",
      ropeContext: "未設定",
      tags: ["下書き"],
      level: 0,
      levelCategory: "未分類",
      status: "draft",
      sourceId: "",
      showSource: false
    };
  }

  async function createDraft() {
    const draft = makeDraftTrick();
    setDrafts((current) => [draft, ...current]);
    setSelectedId(draft.id);

    if (prototypeMode) {
      setSaveMessage("新規下書きをブラウザ内stateに追加しました。Supabase接続後はDBへ作成します。");
      return;
    }

    const response = await fetch("/api/admin/tricks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft)
    });
    const result = await response.json();
    setSaveMessage(response.ok ? "新規下書きを作成しました。" : `作成に失敗しました: ${result.error ?? "unknown error"}`);
  }

  async function deleteSelected() {
    if (!selected) return;
    const ok = window.confirm(`${selected.name}を削除します。関連する動画・相関もDB上では削除対象です。`);
    if (!ok) return;

    setDrafts((current) => current.filter((trick) => trick.id !== selected.id));
    setRelationDrafts((current) => current.filter((relation) => relation.fromTrickId !== selected.id && relation.toTrickId !== selected.id));
    setMediaDrafts((current) => current.filter((asset) => asset.trickId !== selected.id));
    setSelectedId((current) => {
      if (current !== selected.id) return current;
      return drafts.find((trick) => trick.id !== selected.id)?.id ?? "";
    });

    if (prototypeMode) {
      setSaveMessage("プロトタイプではブラウザ内stateから削除しました。");
      return;
    }

    const response = await fetch(`/api/admin/tricks?slug=${encodeURIComponent(selected.slug)}`, { method: "DELETE" });
    const result = await response.json();
    setSaveMessage(response.ok ? "削除しました。" : `削除に失敗しました: ${result.error ?? "unknown error"}`);
  }

  async function saveSelected() {
    if (!selected) return;
    if (prototypeMode) {
      setSaveMessage("プロトタイプではブラウザ内stateだけを更新しました。Supabase接続後は技・相関・動画パスをまとめて保存します。");
      return;
    }

    const trickResponse = await fetch("/api/admin/tricks", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: selected.id,
        slug: selected.slug,
        name: selected.name,
        aliases: selected.aliases,
        summary: selected.summary,
        description: selected.description,
        originNote: selected.originNote,
        practiceSteps: selected.practiceSteps,
        commonMistakes: selected.commonMistakes,
        safetyNotes: selected.safetyNotes,
        coachComment: selected.coachComment,
        knowledgeStatus: selected.knowledgeStatus,
        knowledgeReviewedBy: selected.knowledgeReviewedBy,
        knowledgeSourceUrls: selected.knowledgeSourceUrls,
        showKnowledgeSources: selected.showKnowledgeSources,
        difficulty: selected.difficulty,
        riskLevel: selected.riskLevel,
        discipline: selected.discipline,
        family: selected.family,
        axis: selected.axis,
        takeoff: selected.takeoff,
        landing: selected.landing,
        ropeContext: selected.ropeContext,
        tags: selected.tags,
        level: selected.level || null,
        levelCategory: selected.levelCategory,
        status: selected.status,
        showSource: selected.showSource
      })
    });
    const trickResult = await trickResponse.json();
    if (!trickResponse.ok) {
      setSaveMessage(`技データの保存に失敗しました: ${trickResult.error ?? "unknown error"}`);
      return;
    }

    const relationResponse = await fetch("/api/admin/relations", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        trickId: selected.id,
        incomingBaseIds: selectedBaseRelations.map((relation) => relation.fromTrickId),
        outgoingAdvancedIds: selectedAdvancedRelations.map((relation) => relation.toTrickId)
      })
    });
    const relationResult = await relationResponse.json();
    if (!relationResponse.ok) {
      setSaveMessage(`相関の保存に失敗しました: ${relationResult.error ?? "unknown error"}`);
      return;
    }

    const mediaResponse = await fetch("/api/admin/media", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slug: selected.slug,
        mediaAssets: selectedVideos.map(mediaPayload)
      })
    });
    const mediaResult = await mediaResponse.json();
    if (mediaResponse.ok) {
      setKnowledgeChangedIds((current) => {
        const next = new Set(current);
        next.delete(selected.id);
        return next;
      });
    }
    setSaveMessage(mediaResponse.ok ? "技データ、相関、挿入動画を保存しました。" : `動画パスの保存に失敗しました: ${mediaResult.error ?? "unknown error"}`);
  }

  async function saveAllKnowledge() {
    const changedIds = Array.from(knowledgeChangedIds).filter((id) => trickById.has(id));
    if (!changedIds.length) {
      setKnowledgeMessage("保存待ちの知識メモはありません。");
      return;
    }

    if (prototypeMode) {
      setKnowledgeChangedIds(new Set());
      setKnowledgeMessage(`プロトタイプでは${changedIds.length}技分の知識メモをブラウザ内stateに反映しました。Supabase接続後はDBへ保存します。`);
      return;
    }

    let saved = 0;
    for (const id of changedIds) {
      const trick = trickById.get(id);
      if (!trick) continue;

      const response = await fetch("/api/admin/tricks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: trick.id,
          ...knowledgePayload(trick)
        })
      });
      const result = await response.json();
      if (!response.ok) {
        setKnowledgeMessage(`${trick.name} の知識メモ保存に失敗しました: ${result.error ?? "unknown error"}`);
        return;
      }
      saved += 1;
    }

    setKnowledgeChangedIds((current) => {
      const savedSet = new Set(changedIds);
      return new Set(Array.from(current).filter((id) => !savedSet.has(id)));
    });
    setKnowledgeMessage(`知識メモをDBへ保存しました: ${saved}技`);
  }

  async function saveAllVideos() {
    const affectedTrickIds = Array.from(new Set([...mediaAssets.map((asset) => asset.trickId), ...mediaDrafts.map((asset) => asset.trickId)]));

    if (prototypeMode) {
      setVideoMessage(`プロトタイプでは画面上の動画台帳だけを更新しました。Supabase接続後は${affectedTrickIds.length}技分をDBへ保存します。`);
      return;
    }

    let saved = 0;
    for (const trickId of affectedTrickIds) {
      const trick = trickById.get(trickId);
      if (!trick) continue;
      const trickVideos = mediaDrafts.filter((asset) => asset.trickId === trick.id && asset.type === "video");
      const response = await fetch("/api/admin/media", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: trick.slug,
          mediaAssets: trickVideos.map(mediaPayload)
        })
      });
      const result = await response.json();
      if (!response.ok) {
        setVideoMessage(`${trick.name} の動画保存に失敗しました: ${result.error ?? "unknown error"}`);
        return;
      }
      saved += 1;
    }

    setVideoMessage(`動画台帳をDBへ保存しました: ${saved}技 / ${mediaDrafts.length}件`);
  }

  function updateRelationIds(kind: "base" | "advanced", targetIds: string[]) {
    if (!selected) return;

    const validIds = Array.from(new Set(targetIds.filter((id) => id !== selected.id && trickById.has(id))));

    setRelationDrafts((current) => {
      const kept =
        kind === "base"
          ? current.filter((relation) => !(relation.toTrickId === selected.id && isLearningRelation(relation)))
          : current.filter((relation) => !(relation.fromTrickId === selected.id && relation.type === "progression"));

      const additions = validIds.map((id, index) => {
        const fromTrickId = kind === "base" ? id : selected.id;
        const toTrickId = kind === "base" ? selected.id : id;
        const existing = current.find(
          (relation) =>
            relation.fromTrickId === fromTrickId &&
            relation.toTrickId === toTrickId &&
            (kind === "base" ? isLearningRelation(relation) : relation.type === "progression")
        );

        return (
          existing ?? {
            id: `draft-relation-${kind}-${selected.id}-${id}-${index}`,
            fromTrickId,
            toTrickId,
            type: kind === "base" ? "prerequisite" : "progression",
            note: "管理画面で選択",
            strength: 3,
            waypoints: []
          }
        ) satisfies TrickRelation;
      });

      return [...kept, ...additions];
    });

    setRelationMessage(`${kind === "base" ? "基礎技" : "応用技"}を${validIds.length}件選択しました。保存するとDBへ反映します。`);
  }

  function addVideoDraft() {
    if (!selected) return;
    setMediaDrafts((current) => [
      ...current,
      {
        id: `draft-media-${selected.id}-${Date.now()}`,
        trickId: selected.id,
        type: "video" as const,
        storagePath: "",
        referenceUrl: "",
        rightsNote: "",
        consentChecked: false
      }
    ]);
    setVideoMessage("動画候補を追加しました。参考URLと秒数を入れ、公開用URLは自分の限定公開動画を入れてください。");
  }

  function updateVideoDraft(id: string, patch: Partial<MediaAsset>) {
    setMediaDrafts((current) => current.map((asset) => (asset.id === id ? { ...asset, ...patch } : asset)));
  }

  function removeVideoDraft(id: string) {
    setMediaDrafts((current) => current.filter((asset) => asset.id !== id));
    setVideoMessage("動画候補を削除しました。保存するとDBへ反映します。");
  }

  async function handleVideo(file: File | undefined, consent: boolean) {
    if (!file) {
      setVideoMessage("動画ファイルが選択されていません。");
      return;
    }
    if (!file.type.startsWith("video/")) {
      setVideoMessage("動画ファイルのみ登録できます。");
      return;
    }
    if (!consent) {
      setVideoMessage("登録前に撮影・出演同意の確認が必要です。");
      return;
    }
    const sizeMb = file.size / 1024 / 1024;
    if (sizeMb > 300) {
      setVideoMessage("300MBを超える動画は圧縮してから登録してください。");
      return;
    }

    if (prototypeMode || !selected) {
      setVideoMessage(`検証OK: ${file.name} (${sizeMb.toFixed(1)}MB)。Supabase Storageの trick-media バケットへ保存する想定です。`);
      return;
    }

    const form = new FormData();
    form.set("slug", selected.slug);
    form.set("consentChecked", "true");
    form.set("file", file);
    const response = await fetch("/api/admin/media", { method: "POST", body: form });
    const result = await response.json();
    if (response.ok && result.storagePath) {
      setMediaDrafts((current) => [
        ...current,
        {
          id: `uploaded-${result.storagePath}`,
          trickId: selected.id,
          type: "video",
          storagePath: result.storagePath,
          consentChecked: true
        }
      ]);
    }
    setVideoMessage(response.ok ? `アップロードしました: ${result.storagePath}` : `アップロード失敗: ${result.error ?? "unknown error"}`);
  }

  const selectedBaseIds = selectedBaseRelations.map((relation) => relation.fromTrickId);
  const selectedAdvancedIds = selectedAdvancedRelations.map((relation) => relation.toTrickId);

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-5 rounded border border-coral/25 bg-coral/8 p-3 text-sm leading-6 text-graphite sm:mb-6 sm:p-4">
        <div className="mb-1 flex items-center gap-2 font-black text-ink">
          <Lock aria-hidden className="size-4 text-coral" />
          管理者エリア
        </div>
        {prototypeMode
          ? "Supabase環境変数が未設定のため、ローカルseedを編集するプロトタイプ画面として表示しています。本番ではSupabase Authのadminロールだけがアクセスできます。"
          : "Supabase Authのadminロールでアクセス中です。"}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-4">
        <AdminMetric label="技" value={drafts.length} tone="pine" />
        <AdminMetric label="公開" value={drafts.filter((trick) => trick.status === "published").length} tone="saffron" />
        <AdminMetric label="相関" value={relationDrafts.length} tone="coral" />
        <AdminMetric label="動画" value={mediaDrafts.length} tone="graphite" />
      </div>

      <AdminSectionTabs activeSection={activeSection} onChange={setActiveSection} />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr] lg:gap-5">
        <aside className="rounded border border-ink/10 bg-white p-3 shadow-sm sm:p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-ink">
            <Database aria-hidden className="size-4 text-pine" />
            編集対象
          </h2>
          <button
            type="button"
            onClick={createDraft}
            className="mb-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-pine px-3 text-sm font-black text-white transition hover:bg-ink"
          >
            <Plus aria-hidden className="size-4" />
            新規下書き
          </button>
          <div className="grid max-h-[300px] gap-2 overflow-auto pr-1 lg:max-h-[720px]">
            {drafts.map((trick) => (
              <button
                key={trick.id}
                type="button"
                onClick={() => setSelectedId(trick.id)}
                className={`rounded border px-3 py-2 text-left text-sm transition ${
                  selected?.id === trick.id ? "border-pine bg-skywash text-pine" : "border-ink/8 bg-paper text-graphite hover:border-pine"
                }`}
              >
                <span className="block font-bold">{trick.name}</span>
                <span className="text-xs">
                  Lv.{trick.level || "-"} / {trick.discipline} / {trick.family} / {trick.status}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="grid gap-4 lg:gap-5">
          {selected && activeSection === "tricks" ? (
            <section className="rounded border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-pine">Trick Bundle</p>
                  <h1 className="break-words text-xl font-black text-ink sm:text-2xl">{selected.name}</h1>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-pine px-4 text-sm font-black text-white transition hover:bg-ink sm:w-auto"
                    onClick={saveSelected}
                  >
                    <Save aria-hidden className="size-4" />
                    まとめて保存
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded border border-coral px-4 text-sm font-black text-coral transition hover:bg-coral hover:text-white sm:w-auto"
                    onClick={deleteSelected}
                  >
                    <Trash2 aria-hidden className="size-4" />
                    削除
                  </button>
                </div>
              </div>
              <p className="mb-4 rounded bg-paper px-3 py-2 text-xs font-semibold text-graphite/72">{saveMessage}</p>

              <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr] xl:gap-5">
                <div className="grid gap-4">
                  <Panel icon={Layers} title="基本情報">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="技名" value={selected.name} onChange={(value) => updateSelected("name", value)} />
                      <Field label="slug" value={selected.slug} onChange={(value) => updateSelected("slug", value)} />
                      <ListField label="別名" values={selected.aliases} onChange={(value) => updateSelected("aliases", value)} />
                      <ListField label="タグ" values={selected.tags} onChange={(value) => updateSelected("tags", value)} />
                      <Field label="要約" value={selected.summary} onChange={(value) => updateSelected("summary", value)} />
                      <Field label="大分類" value={selected.discipline} onChange={(value) => updateSelected("discipline", value)} />
                      <Field label="系統" value={selected.family} onChange={(value) => updateSelected("family", value)} />
                      <Field label="軸" value={selected.axis} onChange={(value) => updateSelected("axis", value)} />
                      <Field label="縄文脈" value={selected.ropeContext} onChange={(value) => updateSelected("ropeContext", value)} />
                      <Field label="踏切" value={selected.takeoff} onChange={(value) => updateSelected("takeoff", value)} />
                      <Field label="着地" value={selected.landing} onChange={(value) => updateSelected("landing", value)} />
                      <IntegerField label="レベル" min={0} max={10} value={selected.level} onChange={(value) => updateSelected("level", value)} />
                      <Field label="レベルカテゴリ" value={selected.levelCategory} onChange={(value) => updateSelected("levelCategory", value)} />
                      <NumberField label="難度" value={selected.difficulty} onChange={(value) => updateSelected("difficulty", value)} />
                      <NumberField label="危険度" value={selected.riskLevel} onChange={(value) => updateSelected("riskLevel", value)} />
                      <StatusField value={selected.status} onChange={(value) => updateSelected("status", value)} />
                    </div>
                    <label className="mt-4 flex items-center gap-2 text-sm font-bold text-graphite">
                      <input
                        type="checkbox"
                        checked={selected.showSource}
                        onChange={(event) => updateSelected("showSource", event.target.checked)}
                        className="size-4 accent-pine"
                      />
                      公開画面に出典を表示する
                    </label>
                  </Panel>

                  <Panel icon={Database} title="説明文">
                    <textarea
                      value={selected.description}
                      onChange={(event) => updateSelected("description", event.target.value)}
                      className="min-h-40 w-full rounded border border-ink/14 bg-paper px-3 py-2 text-sm leading-6 outline-none focus:border-pine"
                    />
                  </Panel>

                  <Panel icon={Database} title="図鑑メモ">
                    <div className="grid gap-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <KnowledgeStatusField
                          value={selected.knowledgeStatus}
                          onChange={(value) => updateSelected("knowledgeStatus", value)}
                        />
                        <Field
                          label="監修者 / 監修チーム"
                          value={selected.knowledgeReviewedBy}
                          onChange={(value) => updateSelected("knowledgeReviewedBy", value)}
                        />
                      </div>
                      <LongTextField
                        label="発祥・由来"
                        value={selected.originNote}
                        onChange={(value) => updateSelected("originNote", value)}
                      />
                      <TextListField
                        label="練習ステップ"
                        values={selected.practiceSteps}
                        onChange={(value) => updateSelected("practiceSteps", value)}
                      />
                      <TextListField
                        label="よくある失敗"
                        values={selected.commonMistakes}
                        onChange={(value) => updateSelected("commonMistakes", value)}
                      />
                      <TextListField
                        label="安全注意"
                        values={selected.safetyNotes}
                        onChange={(value) => updateSelected("safetyNotes", value)}
                      />
                      <LongTextField
                        label="監修者コメント"
                        value={selected.coachComment}
                        onChange={(value) => updateSelected("coachComment", value)}
                      />
                      <TextListField
                        label="参考リンク"
                        values={selected.knowledgeSourceUrls}
                        onChange={(value) => updateSelected("knowledgeSourceUrls", value)}
                      />
                      <label className="flex items-center gap-2 text-sm font-bold text-graphite">
                        <input
                          type="checkbox"
                          checked={selected.showKnowledgeSources}
                          onChange={(event) => updateSelected("showKnowledgeSources", event.target.checked)}
                          className="size-4 accent-pine"
                        />
                        参考リンクを公開ページに表示する
                      </label>
                    </div>
                  </Panel>
                </div>

                <div className="grid gap-4">
                  <Panel icon={GitBranch} title="基礎技・応用技">
                    <RelationPicker
                      label="基礎技"
                      description="この技の前に練習しておきたい技"
                      options={relationOptions}
                      selectedIds={selectedBaseIds}
                      onChange={(ids) => updateRelationIds("base", ids)}
                    />
                    <RelationPicker
                      label="応用技"
                      description="この技の次に練習する派生技"
                      options={relationOptions}
                      selectedIds={selectedAdvancedIds}
                      onChange={(ids) => updateRelationIds("advanced", ids)}
                    />
                    <p className="mt-3 rounded bg-paper px-3 py-2 text-xs font-semibold text-graphite/72">{relationMessage}</p>
                  </Panel>

                  <Panel icon={FileVideo} title="挿入動画">
                    <VideoReferenceEditor
                      videos={selectedVideos}
                      trick={selected}
                      onAdd={addVideoDraft}
                      onUpdate={updateVideoDraft}
                      onRemove={removeVideoDraft}
                      onMessage={setVideoMessage}
                    />
                    <VideoUpload onValidate={handleVideo} message={videoMessage} />
                  </Panel>
                </div>
              </div>
            </section>
          ) : null}

          {activeSection === "knowledge" ? (
            <KnowledgeBulkEditor
              tricks={drafts}
              changedIds={knowledgeChangedIds}
              message={knowledgeMessage}
              onUpdate={updateKnowledgeDraft}
              onSave={saveAllKnowledge}
              onOpenTrick={(id) => {
                setSelectedId(id);
                setActiveSection("tricks");
              }}
            />
          ) : null}

          {activeSection === "videos" ? (
            <VideoBulkEditor
              tricks={drafts}
              mediaAssets={mediaDrafts}
              onMediaChange={setMediaDrafts}
              onSave={saveAllVideos}
              onMessage={setVideoMessage}
              message={videoMessage}
            />
          ) : null}

          {activeSection === "relations" ? (
            <RelationBulkEditor tricks={drafts} relations={relationDrafts} onRelationsChange={setRelationDrafts} prototypeMode={prototypeMode} />
          ) : null}

          {activeSection === "layout" ? (
            <AdminMapEditor tricks={drafts} relations={relationDrafts} mapPositions={mapPositions} prototypeMode={prototypeMode} onRelationsChange={setRelationDrafts} />
          ) : null}

          {activeSection === "status" ? (
          <section className="grid gap-4 lg:grid-cols-3 lg:gap-5">
            <Panel icon={LinkIcon} title="選択中の相関">
              <RelationPreview relations={relationDrafts} tricks={drafts} selectedId={selected?.id} />
            </Panel>
            <Panel icon={FileVideo} title="登録動画">
              <p className="mb-3 text-sm leading-6 text-graphite/76">選択中: {selectedVideos.length}件 / 全体: {mediaDrafts.length}件</p>
              <div className="max-h-40 overflow-auto rounded bg-paper p-2 text-xs leading-5 text-graphite">
                {selectedVideos.length
                  ? selectedVideos.map((asset) => (
                      <div key={asset.id} className="border-b border-ink/8 py-1 last:border-0">
                        <div className="font-bold">{asset.storagePath || "公開用URL未設定"}</div>
                        {asset.referenceUrl ? <div className="text-graphite/62">参考: {asset.referenceUrl}</div> : null}
                      </div>
                    ))
                  : "登録動画はまだありません。"}
              </div>
            </Panel>
            <Panel icon={Database} title="レベル表・出典">
              <p className="text-sm leading-6 text-graphite/76">
                レベル表: {levels.length}件 / 出典: {sources.length}件。PDF出典は保持し、公開表示は技ごとに切り替えます。
              </p>
            </Panel>
          </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function AdminSectionTabs({ activeSection, onChange }: { activeSection: AdminSection; onChange: (section: AdminSection) => void }) {
  const sections: Array<{ id: AdminSection; label: string; description: string }> = [
    { id: "tricks", label: "技を編集", description: "名前・説明・動画" },
    { id: "knowledge", label: "知識台帳", description: "由来・安全・監修" },
    { id: "videos", label: "動画台帳", description: "参考URL・公開URL" },
    { id: "relations", label: "繋がり", description: "相関の一覧・一括指定" },
    { id: "layout", label: "配置", description: "公式スキルツリー" },
    { id: "status", label: "確認", description: "相関・動画・出典" }
  ];

  return (
    <div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
      {sections.map((section) => {
        const isActive = activeSection === section.id;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            className={`rounded border p-3 text-left transition ${
              isActive ? "border-pine bg-skywash text-pine shadow-sm" : "border-ink/10 bg-white text-graphite hover:border-pine"
            }`}
          >
            <span className="block text-sm font-black">{section.label}</span>
            <span className="mt-1 block text-xs font-semibold opacity-75">{section.description}</span>
          </button>
        );
      })}
    </div>
  );
}

function AdminMetric({ label, value, tone }: { label: string; value: number; tone: "pine" | "saffron" | "graphite" | "coral" }) {
  const toneClass = {
    pine: "text-pine",
    saffron: "text-saffron",
    graphite: "text-graphite",
    coral: "text-coral"
  }[tone];

  return (
    <section className="rounded border border-ink/10 bg-white p-3 shadow-sm sm:p-4">
      <p className="text-xs font-black text-graphite/62">{label}</p>
      <p className={`mt-2 text-2xl font-black sm:text-3xl ${toneClass}`}>{value}</p>
    </section>
  );
}

function StatusField({ value, onChange }: { value: Trick["status"]; onChange: (value: Trick["status"]) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-ink">公開状態</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Trick["status"])}
        className="h-11 w-full rounded border border-ink/14 bg-paper px-3 text-sm outline-none focus:border-pine"
      >
        <option value="draft">下書き</option>
        <option value="published">公開</option>
      </select>
    </label>
  );
}

function KnowledgeStatusField({ value, onChange }: { value: Trick["knowledgeStatus"]; onChange: (value: Trick["knowledgeStatus"]) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-ink">知識メモの状態</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Trick["knowledgeStatus"])}
        className="h-11 w-full rounded border border-ink/14 bg-paper px-3 text-sm outline-none focus:border-pine"
      >
        <option value="draft">下書き</option>
        <option value="reviewing">監修中</option>
        <option value="reviewed">監修済み</option>
      </select>
    </label>
  );
}

function Field({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded border border-ink/14 bg-paper px-3 text-sm outline-none focus:border-pine"
      />
    </label>
  );
}

function ListField({ label, values, onChange }: { label: string; values: string[]; onChange: (value: string[]) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <input
        value={values.join(", ")}
        onChange={(event) => onChange(splitList(event.target.value))}
        className="h-11 w-full rounded border border-ink/14 bg-paper px-3 text-sm outline-none focus:border-pine"
      />
    </label>
  );
}

function LongTextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-24 w-full rounded border border-ink/14 bg-paper px-3 py-2 text-sm leading-6 outline-none focus:border-pine"
      />
    </label>
  );
}

function TextListField({ label, values, onChange }: { label: string; values: string[]; onChange: (value: string[]) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <textarea
        value={values.join("\n")}
        onChange={(event) => onChange(splitLines(event.target.value))}
        placeholder="1行に1項目ずつ入力"
        className="min-h-28 w-full rounded border border-ink/14 bg-paper px-3 py-2 text-sm leading-6 outline-none focus:border-pine"
      />
    </label>
  );
}

function RelationPicker({
  label,
  description,
  options,
  selectedIds,
  onChange
}: {
  label: string;
  description: string;
  options: Trick[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const optionById = useMemo(() => new Map(options.map((option) => [option.id, option])), [options]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedOptions = selectedIds.map((id) => optionById.get(id)).filter((option): option is Trick => Boolean(option));
  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return options
      .filter((option) => {
        if (!normalizedQuery) return true;
        const searchable = [option.name, option.discipline, option.family, option.levelCategory, ...option.aliases, ...option.tags].join(" ").toLowerCase();
        return searchable.includes(normalizedQuery);
      })
      .slice(0, 80);
  }, [options, query]);

  function toggle(id: string, checked: boolean) {
    if (checked) {
      onChange(selectedIds.includes(id) ? selectedIds : [...selectedIds, id]);
      return;
    }
    onChange(selectedIds.filter((selectedId) => selectedId !== id));
  }

  return (
    <section className="mt-4 rounded border border-ink/10 bg-paper p-3 first:mt-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-ink">{label}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-graphite/70">{description}</p>
        </div>
        <span className="shrink-0 rounded bg-white px-2 py-1 text-xs font-black text-pine">{selectedOptions.length}件</span>
      </div>

      <div className="mt-3 min-h-8">
        {selectedOptions.length ? (
          <div className="flex flex-wrap gap-1.5">
            {selectedOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => toggle(option.id, false)}
                className="rounded border border-pine/20 bg-white px-2 py-1 text-xs font-black text-pine transition hover:border-coral hover:text-coral"
                aria-label={`${option.name}を${label}から外す`}
              >
                {option.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded bg-white px-2 py-1.5 text-xs font-semibold text-graphite/58">未選択</p>
        )}
      </div>

      <label className="mt-3 flex h-10 items-center gap-2 rounded border border-ink/12 bg-white px-3 text-sm focus-within:border-pine">
        <Search aria-hidden className="size-4 shrink-0 text-graphite/42" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="技名・系統・タグで検索"
          className="h-full min-w-0 flex-1 bg-transparent outline-none"
        />
      </label>

      <div className="mt-3 grid max-h-64 gap-1.5 overflow-auto pr-1">
        {visibleOptions.length ? (
          visibleOptions.map((option) => (
            <label
              key={option.id}
              className={`grid cursor-pointer grid-cols-[auto_1fr] gap-2 rounded border px-2.5 py-2 text-sm transition ${
                selectedSet.has(option.id) ? "border-pine bg-skywash text-pine" : "border-ink/8 bg-white text-graphite hover:border-pine"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedSet.has(option.id)}
                onChange={(event) => toggle(option.id, event.target.checked)}
                className="mt-0.5 size-4 accent-pine"
              />
              <span className="min-w-0">
                <span className="block truncate font-bold">{option.name}</span>
                <span className="mt-0.5 block truncate text-xs opacity-70">
                  Lv.{option.level || "-"} / {option.discipline} / {option.family}
                </span>
              </span>
            </label>
          ))
        ) : (
          <p className="rounded bg-white px-3 py-2 text-xs font-semibold text-graphite/62">一致する技がありません。</p>
        )}
      </div>
    </section>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: 1 | 2 | 3 | 4 | 5) => void }) {
  function normalize(input: number): 1 | 2 | 3 | 4 | 5 {
    return Math.max(1, Math.min(5, input)) as 1 | 2 | 3 | 4 | 5;
  }

  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <input
        min={1}
        max={5}
        type="number"
        value={value}
        onChange={(event) => onChange(normalize(Number(event.target.value)))}
        className="h-11 w-full rounded border border-ink/14 bg-paper px-3 text-sm outline-none focus:border-pine"
      />
    </label>
  );
}

function IntegerField({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <input
        min={min}
        max={max}
        type="number"
        value={value}
        onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value))))}
        className="h-11 w-full rounded border border-ink/14 bg-paper px-3 text-sm outline-none focus:border-pine"
      />
    </label>
  );
}

function Panel({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="rounded border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-ink">
        <Icon aria-hidden className="size-4 text-pine" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function RelationPreview({ relations, tricks, selectedId }: { relations: TrickRelation[]; tricks: Trick[]; selectedId?: string }) {
  const trickById = new Map(tricks.map((trick) => [trick.id, trick]));
  const visible = selectedId ? relations.filter((relation) => relation.fromTrickId === selectedId || relation.toTrickId === selectedId) : relations;

  return (
    <div className="max-h-44 overflow-auto rounded bg-paper p-2 text-xs leading-5 text-graphite">
      {visible.length
        ? visible.slice(0, 18).map((relation) => (
            <div key={relation.id}>
              {relationLabel(relation.type)}: {trickById.get(relation.fromTrickId)?.name ?? relation.fromTrickId} → {trickById.get(relation.toTrickId)?.name ?? relation.toTrickId}
            </div>
          ))
        : "登録された相関はまだありません。"}
    </div>
  );
}

function KnowledgeBulkEditor({
  tricks,
  changedIds,
  message,
  onUpdate,
  onSave,
  onOpenTrick
}: {
  tricks: Trick[];
  changedIds: Set<string>;
  message: string;
  onUpdate: (id: string, patch: KnowledgePatch) => void;
  onSave: () => void;
  onOpenTrick: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [visibleLimit, setVisibleLimit] = useState(24);

  const stats = useMemo(
    () => ({
      draft: tricks.filter((trick) => trick.knowledgeStatus === "draft").length,
      reviewing: tricks.filter((trick) => trick.knowledgeStatus === "reviewing").length,
      reviewed: tricks.filter((trick) => trick.knowledgeStatus === "reviewed").length,
      needsAliases: tricks.filter(needsAliasReview).length,
      needsOrigin: tricks.filter(needsOriginReview).length,
      needsSafety: tricks.filter(needsSafetyReview).length,
      changed: changedIds.size
    }),
    [changedIds, tricks]
  );

  const visibleTricks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tricks
      .filter((trick) => {
        const matchesQuery = !normalized || knowledgeSearchText(trick).includes(normalized);
        const matchesFilter =
          stateFilter === "all" ||
          trick.knowledgeStatus === stateFilter ||
          (stateFilter === "needsAliases" && needsAliasReview(trick)) ||
          (stateFilter === "needsOrigin" && needsOriginReview(trick)) ||
          (stateFilter === "needsSafety" && needsSafetyReview(trick)) ||
          (stateFilter === "changed" && changedIds.has(trick.id));
        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "ja"));
  }, [changedIds, query, stateFilter, tricks]);
  const shownTricks = visibleTricks.slice(0, visibleLimit);

  useEffect(() => {
    setVisibleLimit(24);
  }, [query, stateFilter]);

  return (
    <section className="rounded border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black text-ink">
            <BookOpenText aria-hidden className="size-4 text-pine" />
            知識台帳
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-graphite/76">
            由来、説明文、練習ステップ、安全注意、監修状態を横断で見直します。公開ページに出す前の下書き管理にも使えます。
          </p>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={!changedIds.size}
          className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded px-4 text-sm font-black text-white transition sm:w-auto ${
            changedIds.size ? "bg-pine hover:bg-ink" : "cursor-not-allowed bg-graphite/35"
          }`}
        >
          <Save aria-hidden className="size-4" />
          変更分をDB保存
        </button>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <KnowledgeStat label="下書き" value={stats.draft} />
        <KnowledgeStat label="監修中" value={stats.reviewing} />
        <KnowledgeStat label="監修済み" value={stats.reviewed} />
        <KnowledgeStat label="別名未設定" value={stats.needsAliases} />
        <KnowledgeStat label="由来要補強" value={stats.needsOrigin} />
        <KnowledgeStat label="安全要補強" value={stats.needsSafety} />
        <KnowledgeStat label="未保存" value={stats.changed} />
      </div>

      <p className="mb-3 rounded bg-paper px-3 py-2 text-xs font-semibold text-graphite/72">{message}</p>

      <div className="mb-4 grid gap-2 md:grid-cols-[1fr_220px]">
        <label className="flex h-10 min-w-0 items-center gap-2 rounded border border-ink/12 bg-paper px-3 text-sm focus-within:border-pine">
          <Search aria-hidden className="size-4 shrink-0 text-graphite/42" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="技名・分類・由来・安全メモで検索"
            className="h-full min-w-0 flex-1 bg-transparent outline-none"
          />
        </label>
        <select
          value={stateFilter}
          onChange={(event) => setStateFilter(event.target.value)}
          className="h-10 rounded border border-ink/14 bg-paper px-3 text-sm font-bold outline-none focus:border-pine"
        >
          <option value="all">全状態</option>
          <option value="draft">下書き</option>
          <option value="reviewing">監修中</option>
          <option value="reviewed">監修済み</option>
          <option value="needsAliases">別名未設定</option>
          <option value="needsOrigin">由来要補強</option>
          <option value="needsSafety">安全要補強</option>
          <option value="changed">未保存のみ</option>
        </select>
      </div>

      <p className="mb-3 text-xs font-black text-graphite/62">
        表示中: {shownTricks.length} / {visibleTricks.length} 技
      </p>

      <div className="grid gap-3">
        {shownTricks.length ? (
          shownTricks.map((trick) => {
            const changed = changedIds.has(trick.id);
            return (
              <section
                key={trick.id}
                className={`rounded border p-3 transition sm:p-4 ${changed ? "border-coral/45 bg-coral/5" : "border-ink/10 bg-paper"}`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <KnowledgeStatusBadge status={trick.knowledgeStatus} />
                      {changed ? <span className="rounded bg-coral px-2 py-1 text-[11px] font-black text-white">未保存</span> : null}
                      {needsAliasReview(trick) ? (
                        <span className="inline-flex items-center gap-1 rounded bg-paper px-2 py-1 text-[11px] font-black text-graphite">
                          別名未設定
                        </span>
                      ) : null}
                      {needsOriginReview(trick) ? (
                        <span className="inline-flex items-center gap-1 rounded bg-saffron/18 px-2 py-1 text-[11px] font-black text-graphite">
                          <BookOpenText aria-hidden className="size-3" />
                          由来要補強
                        </span>
                      ) : null}
                      {needsSafetyReview(trick) ? (
                        <span className="inline-flex items-center gap-1 rounded bg-coral/10 px-2 py-1 text-[11px] font-black text-coral">
                          <ShieldAlert aria-hidden className="size-3" />
                          安全要補強
                        </span>
                      ) : null}
                    </div>
                    <h3 className="break-words text-lg font-black text-ink">{trick.name}</h3>
                    <p className="mt-1 text-xs font-semibold leading-5 text-graphite/62">
                      Lv.{trick.level || "-"} / {trick.discipline} / {trick.family}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenTrick(trick.id)}
                    className="inline-flex h-9 w-full items-center justify-center rounded border border-ink/14 bg-white px-3 text-xs font-black text-graphite transition hover:border-pine hover:text-pine md:w-auto"
                  >
                    個別編集へ
                  </button>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <div className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <KnowledgeStatusField value={trick.knowledgeStatus} onChange={(value) => onUpdate(trick.id, { knowledgeStatus: value })} />
                      <Field
                        label="監修者 / 監修チーム"
                        value={trick.knowledgeReviewedBy}
                        onChange={(value) => onUpdate(trick.id, { knowledgeReviewedBy: value })}
                      />
                    </div>
                    <Field label="要約" value={trick.summary} onChange={(value) => onUpdate(trick.id, { summary: value })} />
                    <TextListField label="別名・呼び方" values={trick.aliases} onChange={(value) => onUpdate(trick.id, { aliases: value })} />
                    <LongTextField label="発祥・由来" value={trick.originNote} onChange={(value) => onUpdate(trick.id, { originNote: value })} />
                    <TextListField label="安全注意" values={trick.safetyNotes} onChange={(value) => onUpdate(trick.id, { safetyNotes: value })} />
                  </div>

                  <details className="rounded border border-ink/10 bg-white p-3">
                    <summary className="cursor-pointer rounded bg-paper px-3 py-2 text-sm font-black text-pine">
                      説明・練習メモも編集
                    </summary>
                    <div className="mt-3 grid gap-3">
                      <LongTextField label="説明文" value={trick.description} onChange={(value) => onUpdate(trick.id, { description: value })} />
                      <TextListField label="練習ステップ" values={trick.practiceSteps} onChange={(value) => onUpdate(trick.id, { practiceSteps: value })} />
                      <TextListField label="よくある失敗" values={trick.commonMistakes} onChange={(value) => onUpdate(trick.id, { commonMistakes: value })} />
                      <LongTextField label="監修者コメント" value={trick.coachComment} onChange={(value) => onUpdate(trick.id, { coachComment: value })} />
                      <TextListField
                        label="参考リンク"
                        values={trick.knowledgeSourceUrls}
                        onChange={(value) => onUpdate(trick.id, { knowledgeSourceUrls: value })}
                      />
                      <label className="flex items-center gap-2 text-sm font-bold text-graphite">
                        <input
                          type="checkbox"
                          checked={trick.showKnowledgeSources}
                          onChange={(event) => onUpdate(trick.id, { showKnowledgeSources: event.target.checked })}
                          className="size-4 accent-pine"
                        />
                        参考リンクを公開ページに表示する
                      </label>
                    </div>
                  </details>
                </div>
              </section>
            );
          })
        ) : (
          <p className="rounded border border-dashed border-ink/20 bg-paper p-5 text-center text-sm font-semibold text-graphite/70">
            条件に合う技がありません。
          </p>
        )}
        {visibleTricks.length > shownTricks.length ? (
          <button
            type="button"
            onClick={() => setVisibleLimit((current) => current + 24)}
            className="inline-flex h-10 items-center justify-center rounded border border-pine px-3 text-sm font-black text-pine transition hover:bg-pine hover:text-white"
          >
            さらに24件表示
          </button>
        ) : null}
      </div>
    </section>
  );
}

function KnowledgeStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-ink/10 bg-paper px-2 py-2 text-center">
      <p className="text-[10px] font-black text-graphite/58">{label}</p>
      <p className="mt-1 text-lg font-black text-ink">{value}</p>
    </div>
  );
}

function KnowledgeStatusBadge({ status }: { status: Trick["knowledgeStatus"] }) {
  const style = {
    draft: "bg-paper text-graphite border-ink/10",
    reviewing: "bg-saffron/18 text-graphite border-saffron/40",
    reviewed: "bg-skywash text-pine border-pine/25"
  }[status];
  const label = {
    draft: "下書き",
    reviewing: "監修中",
    reviewed: "監修済み"
  }[status];

  return <span className={`rounded border px-2 py-1 text-[11px] font-black ${style}`}>{label}</span>;
}

function VideoBulkEditor({
  tricks,
  mediaAssets,
  onMediaChange,
  onSave,
  onMessage,
  message
}: {
  tricks: Trick[];
  mediaAssets: MediaAsset[];
  onMediaChange: (mediaAssets: MediaAsset[]) => void;
  onSave: () => void;
  onMessage: (message: string) => void;
  message: string;
}) {
  const trickById = useMemo(() => new Map(tricks.map((trick) => [trick.id, trick])), [tricks]);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [videoText, setVideoText] = useState(() => exportVideoRows(mediaAssets, new Map(tricks.map((trick) => [trick.id, trick]))));

  const videoAssets = useMemo(() => mediaAssets.filter((asset) => asset.type === "video"), [mediaAssets]);
  const videoStats = useMemo(
    () => ({
      ready: videoAssets.filter((asset) => videoWorkflowState(asset).kind === "ready").length,
      needsPublishUrl: videoAssets.filter((asset) => videoWorkflowState(asset).kind === "needsPublishUrl").length,
      needsConsent: videoAssets.filter((asset) => videoWorkflowState(asset).kind === "needsConsent").length,
      empty: videoAssets.filter((asset) => videoWorkflowState(asset).kind === "empty").length
    }),
    [videoAssets]
  );

  const visibleVideos = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return videoAssets
      .filter((asset) => {
        const trick = trickById.get(asset.trickId);
        const state = videoWorkflowState(asset).kind;
        const haystack = [
          trick?.name,
          trick?.slug,
          trick?.discipline,
          trick?.family,
          asset.storagePath,
          asset.referenceUrl,
          asset.credit,
          asset.rightsNote,
          state
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return (!normalized || haystack.includes(normalized)) && (stateFilter === "all" || state === stateFilter);
      })
      .sort((a, b) => {
        const trickA = trickById.get(a.trickId);
        const trickB = trickById.get(b.trickId);
        return (trickA?.level ?? 999) - (trickB?.level ?? 999) || (trickA?.name ?? "").localeCompare(trickB?.name ?? "", "ja");
      });
  }, [query, stateFilter, trickById, videoAssets]);

  function syncTextFromCurrent() {
    setVideoText(exportVideoRows(mediaAssets, trickById));
    onMessage("現在の動画台帳をテキスト欄へ反映しました。");
  }

  function applyVideoText() {
    const result = parseVideoRows(videoText, tricks, mediaAssets);
    if (result.errors.length) {
      onMessage(`反映できない行があります: ${result.errors.slice(0, 4).join(" / ")}`);
      return;
    }

    onMediaChange(result.mediaAssets);
    onMessage(`${result.videoCount}件の動画候補を画面上に反映しました。保存するとDBへ反映します。`);
  }

  function removeVideo(id: string) {
    onMediaChange(mediaAssets.filter((asset) => asset.id !== id));
    onMessage("動画候補を削除しました。保存するとDBへ反映します。");
  }

  async function copyVideoMemo(asset: MediaAsset, trick?: Trick) {
    const text = makeVideoWorkMemo(asset, trick);
    if (!text) {
      onMessage("コピーできる動画メモがありません。");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      onMessage(`${trick?.name ?? "動画候補"} の再アップ用メモをコピーしました。`);
    } catch {
      onMessage("ブラウザの権限でコピーできませんでした。テキスト欄から手動でコピーしてください。");
    }
  }

  async function copyVisibleVideoMemos() {
    const text = visibleVideos
      .map((asset) => makeVideoWorkMemo(asset, trickById.get(asset.trickId)))
      .filter(Boolean)
      .join("\n\n---\n\n");

    if (!text) {
      onMessage("表示中の動画候補にコピーできる作業メモがありません。");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      onMessage(`表示中の${visibleVideos.length}件分の再アップ作業メモをコピーしました。`);
    } catch {
      onMessage("ブラウザの権限でコピーできませんでした。動画台帳のテキストから手動でコピーしてください。");
    }
  }

  return (
    <section className="rounded border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black text-ink">
            <FileVideo aria-hidden className="size-4 text-pine" />
            動画台帳
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-graphite/76">
            書式: 技名 | 参考URL | 開始秒 | 終了秒 | 公開用URL | 公開OK | クレジット | 権利メモ
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <VideoStat label="差し替え待ち" value={videoStats.needsPublishUrl} />
          <VideoStat label="確認待ち" value={videoStats.needsConsent} />
          <VideoStat label="埋め込みOK" value={videoStats.ready} />
          <VideoStat label="未指定" value={videoStats.empty} />
        </div>
      </div>

      <p className="mb-3 rounded bg-paper px-3 py-2 text-xs font-semibold text-graphite/72">{message}</p>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.9fr)]">
        <div className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_160px] lg:grid-cols-[1fr_160px_auto]">
            <label className="flex h-10 min-w-0 items-center gap-2 rounded border border-ink/12 bg-paper px-3 text-sm focus-within:border-pine">
              <Search aria-hidden className="size-4 shrink-0 text-graphite/42" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="技名・URL・メモで検索"
                className="h-full min-w-0 flex-1 bg-transparent outline-none"
              />
            </label>
            <select
              value={stateFilter}
              onChange={(event) => setStateFilter(event.target.value)}
              className="h-10 rounded border border-ink/14 bg-paper px-3 text-sm font-bold outline-none focus:border-pine"
            >
              <option value="all">全状態</option>
              <option value="needsPublishUrl">差し替え待ち</option>
              <option value="needsConsent">確認待ち</option>
              <option value="ready">埋め込みOK</option>
              <option value="empty">未指定</option>
            </select>
            <button
              type="button"
              onClick={copyVisibleVideoMemos}
              className="inline-flex h-10 items-center justify-center gap-2 rounded border border-ink/14 bg-white px-3 text-sm font-black text-graphite transition hover:border-pine hover:text-pine"
            >
              <Copy aria-hidden className="size-4" />
              表示分メモ
            </button>
          </div>

          <div className="max-h-[560px] overflow-auto rounded border border-ink/10 bg-paper p-2">
            {visibleVideos.length ? (
              visibleVideos.map((asset) => {
                const trick = trickById.get(asset.trickId);
                const state = videoWorkflowState(asset);
                const range = formatReferenceRange(asset);
                const reference = timedReferenceUrl(asset);
                return (
                  <section key={asset.id} className="mb-2 rounded border border-ink/8 bg-white p-3 last:mb-0">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-ink">{trick?.name ?? asset.trickId}</p>
                        <p className="mt-0.5 text-xs font-semibold text-graphite/62">
                          Lv.{trick?.level || "-"} / {trick?.discipline ?? "-"} / {trick?.family ?? "-"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVideo(asset.id)}
                        className="grid size-8 shrink-0 place-items-center rounded border border-ink/10 bg-paper text-graphite transition hover:border-coral hover:text-coral"
                        aria-label={`${trick?.name ?? "動画"}を削除`}
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </button>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-black ${state.className}`}>
                      {state.kind === "ready" ? <CheckCircle2 aria-hidden className="size-3.5" /> : <Clock aria-hidden className="size-3.5" />}
                      {state.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyVideoMemo(asset, trick)}
                      className="ml-2 inline-flex min-h-7 items-center gap-1 rounded border border-ink/10 bg-paper px-2 py-1 text-[11px] font-black text-graphite transition hover:border-pine hover:text-pine"
                    >
                      <Copy aria-hidden className="size-3.5" />
                      作業メモ
                    </button>
                    <div className="mt-2 grid gap-1.5 text-xs leading-5 text-graphite/72">
                      {asset.storagePath ? <p className="break-all font-bold text-ink">公開: {asset.storagePath}</p> : null}
                      {reference ? (
                        <a href={reference} target="_blank" rel="noreferrer" className="break-all font-bold text-pine underline-offset-4 hover:underline">
                          参考: {reference}
                          {range ? ` / ${range}` : ""}
                        </a>
                      ) : null}
                      {asset.credit ? <p>クレジット: {asset.credit}</p> : null}
                      {asset.rightsNote ? <p>メモ: {asset.rightsNote}</p> : null}
                    </div>
                  </section>
                );
              })
            ) : (
              <p className="p-3 text-sm text-graphite/70">条件に合う動画候補はありません。</p>
            )}
          </div>
        </div>

        <div className="grid gap-3">
          <textarea
            value={videoText}
            onChange={(event) => setVideoText(event.target.value)}
            className="min-h-[460px] w-full rounded border border-ink/14 bg-paper px-3 py-2 font-mono text-xs leading-5 outline-none focus:border-pine"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={syncTextFromCurrent}
              className="inline-flex h-10 items-center justify-center rounded border border-ink/14 px-3 text-sm font-black text-graphite transition hover:border-pine hover:text-pine"
            >
              現在値を反映
            </button>
            <button
              type="button"
              onClick={applyVideoText}
              className="inline-flex h-10 items-center justify-center rounded border border-pine px-3 text-sm font-black text-pine transition hover:bg-pine hover:text-white"
            >
              画面に反映
            </button>
            <button
              type="button"
              onClick={onSave}
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

function VideoReferenceEditor({
  videos,
  trick,
  onAdd,
  onUpdate,
  onRemove,
  onMessage
}: {
  videos: MediaAsset[];
  trick?: Trick;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<MediaAsset>) => void;
  onRemove: (id: string) => void;
  onMessage: (message: string) => void;
}) {
  const videoStats = useMemo(
    () => ({
      ready: videos.filter((asset) => videoWorkflowState(asset).kind === "ready").length,
      needsPublishUrl: videos.filter((asset) => videoWorkflowState(asset).kind === "needsPublishUrl").length,
      needsConsent: videos.filter((asset) => videoWorkflowState(asset).kind === "needsConsent").length
    }),
    [videos]
  );

  async function copyVideoMemo(asset: MediaAsset) {
    const text = makeVideoWorkMemo(asset, trick);
    if (!text) {
      onMessage("コピーできる動画メモがありません。");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      onMessage(`${trick?.name ?? "動画候補"} の再アップ用メモをコピーしました。`);
    } catch {
      onMessage("ブラウザの権限でコピーできませんでした。動画台帳のテキストから手動でコピーしてください。");
    }
  }

  return (
    <div className="grid gap-3">
      <div className="rounded border border-saffron/35 bg-saffron/10 px-3 py-2 text-xs font-semibold leading-5 text-graphite/78">
        参考URLは編集メモです。公開画面には、許諾済みの公開用URLまたはStorage動画だけを表示します。
      </div>
      <div className="grid grid-cols-3 gap-2">
        <VideoStat label="差し替え待ち" value={videoStats.needsPublishUrl} />
        <VideoStat label="確認待ち" value={videoStats.needsConsent} />
        <VideoStat label="埋め込みOK" value={videoStats.ready} />
      </div>
      {videos.length ? (
        <div className="grid gap-3">
          {videos.map((asset, index) => {
            const state = videoWorkflowState(asset);
            const timedUrl = timedReferenceUrl(asset);
            const range = formatReferenceRange(asset);
            return (
              <section key={asset.id} className="rounded border border-ink/10 bg-paper p-3">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-graphite/62">動画 {index + 1}</p>
                    <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-black ${state.className}`}>
                      {state.kind === "ready" ? <CheckCircle2 aria-hidden className="size-3.5" /> : <Clock aria-hidden className="size-3.5" />}
                      {state.label}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(asset.id)}
                    className="grid size-8 place-items-center rounded border border-ink/10 bg-white text-graphite transition hover:border-coral hover:text-coral"
                    aria-label={`動画${index + 1}を削除`}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </div>
                <div className="grid gap-3">
                  <Field
                    label="公開用URL / Storage path"
                    value={asset.storagePath}
                    placeholder="自分の限定公開YouTube URL または Storage path"
                    onChange={(value) => onUpdate(asset.id, { storagePath: value })}
                  />
                  <VideoPreview asset={asset} />
                  <Field
                    label="参考YouTube URL"
                    value={asset.referenceUrl ?? ""}
                    placeholder="参考にするYouTube URL"
                    onChange={(value) => {
                      const inferredStart = parseTimecodeToSeconds(value);
                      onUpdate(asset.id, {
                        referenceUrl: value,
                        ...(asset.referenceStartSec === undefined && inferredStart !== undefined ? { referenceStartSec: inferredStart } : {})
                      });
                    }}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <OptionalSecondField
                      label="参考開始秒"
                      value={asset.referenceStartSec}
                      onChange={(value) => onUpdate(asset.id, { referenceStartSec: value })}
                    />
                    <OptionalSecondField
                      label="参考終了秒"
                      value={asset.referenceEndSec}
                      onChange={(value) => onUpdate(asset.id, { referenceEndSec: value })}
                    />
                  </div>
                  {timedUrl ? (
                    <a
                      href={timedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-9 items-center gap-2 rounded border border-ink/10 bg-white px-3 py-2 text-xs font-black text-pine transition hover:border-pine"
                    >
                      <ExternalLink aria-hidden className="size-4 shrink-0" />
                      参考区間を開く{range ? ` / ${range}` : ""}
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => copyVideoMemo(asset)}
                    className="inline-flex min-h-9 items-center gap-2 rounded border border-ink/10 bg-white px-3 py-2 text-xs font-black text-graphite transition hover:border-pine hover:text-pine"
                  >
                    <Copy aria-hidden className="size-4 shrink-0" />
                    再アップ用メモをコピー
                  </button>
                  <Field
                    label="権利・許諾メモ"
                    value={asset.rightsNote ?? ""}
                    placeholder="自分で再アップロード済み、出演同意確認済み など"
                    onChange={(value) => onUpdate(asset.id, { rightsNote: value })}
                  />
                  <Field
                    label="表示クレジット / 撮影者"
                    value={asset.credit ?? ""}
                    placeholder="任意"
                    onChange={(value) => onUpdate(asset.id, { credit: value })}
                  />
                  <label className="flex items-center gap-2 text-sm font-semibold text-graphite">
                    <input
                      type="checkbox"
                      checked={asset.consentChecked}
                      onChange={(event) => onUpdate(asset.id, { consentChecked: event.target.checked })}
                      className="size-4 accent-pine"
                    />
                    公開利用できる動画であることを確認済み
                  </label>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <p className="rounded bg-paper px-3 py-2 text-sm font-semibold text-graphite/68">動画候補はまだありません。</p>
      )}
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex h-10 items-center justify-center gap-2 rounded border border-pine px-3 text-sm font-black text-pine transition hover:bg-pine hover:text-white"
      >
        <Plus aria-hidden className="size-4" />
        動画候補を追加
      </button>
    </div>
  );
}

function VideoStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-ink/10 bg-paper px-2 py-2 text-center">
      <p className="text-[10px] font-black text-graphite/58">{label}</p>
      <p className="mt-1 text-lg font-black text-ink">{value}</p>
    </div>
  );
}

function VideoPreview({ asset }: { asset: MediaAsset }) {
  const source = asset.storagePath.trim();
  if (!source) return null;

  const youtubeSrc = youtubeEmbedSrc(source);
  const canRenderVideo = isLikelyDirectVideoPath(source);
  const label = asset.consentChecked ? "公開プレビュー" : "公開前プレビュー";

  if (!youtubeSrc && !canRenderVideo) {
    return (
      <a
        href={source}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-9 items-center gap-2 rounded border border-ink/10 bg-white px-3 py-2 text-xs font-black text-pine transition hover:border-pine"
      >
        <ExternalLink aria-hidden className="size-4 shrink-0" />
        公開URLを開く
      </a>
    );
  }

  return (
    <div className="rounded border border-ink/10 bg-white p-2">
      <p className="mb-2 text-[10px] font-black text-graphite/58">{label}</p>
      {youtubeSrc ? (
        <iframe
          className="aspect-video w-full rounded border border-ink/10 bg-black"
          src={youtubeSrc}
          title={label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <video controls className="aspect-video w-full rounded border border-ink/10 bg-black" src={videoSrc(source)} />
      )}
    </div>
  );
}

function videoWorkflowState(asset: MediaAsset) {
  if (asset.storagePath.trim() && asset.consentChecked) {
    return {
      kind: "ready" as const,
      label: "埋め込みOK",
      className: "border-pine/25 bg-skywash text-pine"
    };
  }
  if (asset.storagePath.trim()) {
    return {
      kind: "needsConsent" as const,
      label: "確認待ち",
      className: "border-saffron/45 bg-saffron/12 text-graphite"
    };
  }
  if (asset.referenceUrl?.trim()) {
    return {
      kind: "needsPublishUrl" as const,
      label: "差し替え待ち",
      className: "border-coral/30 bg-coral/8 text-coral"
    };
  }
  return {
    kind: "empty" as const,
    label: "未指定",
    className: "border-ink/10 bg-white text-graphite/70"
  };
}

function makeVideoWorkMemo(asset: MediaAsset, trick?: Trick) {
  const reference = timedReferenceUrl(asset) || asset.referenceUrl?.trim() || "";
  const range = formatReferenceRange(asset) || "未指定";
  const publicUrl = asset.storagePath.trim() || "未登録";
  const state = videoWorkflowState(asset).label;
  const trickName = trick?.name ?? asset.trickId;

  if (!reference && publicUrl === "未登録") return "";

  return [
    `技名: ${trickName}`,
    `状態: ${state}`,
    `YouTubeタイトル案: ${trickName} お手本`,
    `参考区間: ${range}`,
    `参考URL: ${reference || "未指定"}`,
    `再アップ後の公開用URL: ${publicUrl}`,
    "作業:",
    "- 参考区間を確認する",
    "- 自分で撮影または許諾済みの動画を限定公開でアップロードする",
    "- 再アップ後のURLを公開用URLに貼る",
    "- 公開利用確認にチェックしてDB保存する",
    asset.credit ? `クレジット: ${asset.credit}` : "",
    asset.rightsNote ? `権利・許諾メモ: ${asset.rightsNote}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function OptionalSecondField({ label, value, onChange }: { label: string; value?: number; onChange: (value: number | undefined) => void }) {
  const [draft, setDraft] = useState(value === undefined ? "" : formatSeconds(value));

  useEffect(() => {
    setDraft(value === undefined ? "" : formatSeconds(value));
  }, [value]);

  const parsed = draft.trim() ? parseTimecodeToSeconds(draft) : undefined;
  const isInvalid = Boolean(draft.trim()) && parsed === undefined;

  function updateDraft(next: string) {
    setDraft(next);
    if (!next.trim()) {
      onChange(undefined);
      return;
    }

    const nextSeconds = parseTimecodeToSeconds(next);
    if (nextSeconds !== undefined) onChange(nextSeconds);
  }

  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <input
        type="text"
        value={draft}
        inputMode="numeric"
        placeholder="83 / 1:23 / 1m23s"
        onChange={(event) => updateDraft(event.target.value)}
        onBlur={() => {
          if (value !== undefined) setDraft(formatSeconds(value));
          else if (isInvalid) setDraft("");
        }}
        className={`h-11 w-full rounded border bg-white px-3 text-sm outline-none focus:border-pine ${
          isInvalid ? "border-coral" : "border-ink/14"
        }`}
      />
      <span className={`mt-1 block text-[11px] font-semibold ${isInvalid ? "text-coral" : "text-graphite/58"}`}>
        秒数、分:秒、1m23s、1分23秒で入力できます。
      </span>
    </label>
  );
}

function VideoUpload({ onValidate, message }: { onValidate: (file: File | undefined, consent: boolean) => void; message: string }) {
  const [file, setFile] = useState<File>();
  const [consent, setConsent] = useState(false);

  return (
    <div className="mt-4 grid gap-3">
      <input
        type="file"
        accept="video/*"
        onChange={(event) => setFile(event.target.files?.[0])}
        className="w-full text-sm"
      />
      <label className="flex items-center gap-2 text-sm font-semibold text-graphite">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="size-4 accent-pine" />
        撮影・出演同意を確認済み
      </label>
      <button
        type="button"
        onClick={() => onValidate(file, consent)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded border border-pine px-3 text-sm font-black text-pine transition hover:bg-pine hover:text-white"
      >
        <Upload aria-hidden className="size-4" />
        検証/アップロード
      </button>
      <p className="text-xs leading-5 text-graphite/72">{message}</p>
    </div>
  );
}

function splitList(value: string) {
  return value
    .split(/[\n,、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLines(value: string) {
  return value
    .split(/\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mediaPayload(asset: MediaAsset) {
  return {
    storagePath: asset.storagePath,
    referenceUrl: asset.referenceUrl,
    referenceStartSec: asset.referenceStartSec,
    referenceEndSec: asset.referenceEndSec,
    rightsNote: asset.rightsNote,
    duration: asset.duration,
    credit: asset.credit,
    consentChecked: asset.consentChecked
  };
}

function knowledgePayload(trick: Trick) {
  return {
    aliases: trick.aliases,
    summary: trick.summary,
    description: trick.description,
    originNote: trick.originNote,
    practiceSteps: trick.practiceSteps,
    commonMistakes: trick.commonMistakes,
    safetyNotes: trick.safetyNotes,
    coachComment: trick.coachComment,
    knowledgeStatus: trick.knowledgeStatus,
    knowledgeReviewedBy: trick.knowledgeReviewedBy,
    knowledgeSourceUrls: trick.knowledgeSourceUrls,
    showKnowledgeSources: trick.showKnowledgeSources
  };
}

function needsAliasReview(trick: Trick) {
  return !trick.aliases.length;
}

function needsOriginReview(trick: Trick) {
  const note = trick.originNote.trim();
  return !note || note.includes("監修後") || note.includes("調査中") || note.length < 24;
}

function needsSafetyReview(trick: Trick) {
  return !trick.safetyNotes.length || trick.safetyNotes.join("").length < 20;
}

function knowledgeSearchText(trick: Trick) {
  return [
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
    trick.ropeContext,
    trick.levelCategory,
    ...trick.tags
  ]
    .join(" ")
    .toLowerCase();
}

function exportVideoRows(mediaAssets: MediaAsset[], trickById: Map<string, Trick>) {
  const rows = mediaAssets
    .filter((asset) => asset.type === "video")
    .sort((a, b) => {
      const trickA = trickById.get(a.trickId);
      const trickB = trickById.get(b.trickId);
      return (trickA?.level ?? 999) - (trickB?.level ?? 999) || (trickA?.name ?? "").localeCompare(trickB?.name ?? "", "ja");
    })
    .map((asset) => {
      const trick = trickById.get(asset.trickId);
      return [
        trick?.name ?? asset.trickId,
        asset.referenceUrl ?? "",
        asset.referenceStartSec ?? "",
        asset.referenceEndSec ?? "",
        asset.storagePath,
        asset.consentChecked ? "OK" : "",
        asset.credit ?? "",
        asset.rightsNote ?? ""
      ].join(" | ");
    });

  return ["# 技名 | 参考URL | 開始秒 | 終了秒 | 公開用URL | 公開OK | クレジット | 権利メモ", "# 秒数は 83 / 1:23 / 1m23s / 1分23秒 で入力できます", ...rows].join("\n");
}

function parseVideoRows(text: string, tricks: Trick[], currentMediaAssets: MediaAsset[]) {
  const errors: string[] = [];
  const trickByKey = new Map<string, Trick>();
  for (const trick of tricks) {
    trickByKey.set(normalizeVideoTrickKey(trick.name), trick);
    trickByKey.set(normalizeVideoTrickKey(trick.slug), trick);
    for (const alias of trick.aliases) {
      trickByKey.set(normalizeVideoTrickKey(alias), trick);
    }
  }

  const existingByKey = new Map(
    currentMediaAssets.map((asset) => [videoRowKey(asset.trickId, asset.storagePath, asset.referenceUrl ?? "", asset.referenceStartSec), asset])
  );
  const keptNonVideo = currentMediaAssets.filter((asset) => asset.type !== "video");
  const parsedVideos: MediaAsset[] = [];

  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .forEach((line, index) => {
      const parts = line.split("|").map((part) => part.trim());
      const trick = trickByKey.get(normalizeVideoTrickKey(parts[0]));
      if (!trick) {
        errors.push(`${index + 1}行目: 技名が見つかりません`);
        return;
      }

      const referenceUrl = parts[1] ?? "";
      const referenceStartSec = parseOptionalSecond(parts[2]) ?? parseTimecodeToSeconds(referenceUrl);
      const referenceEndSec = normalizeReferenceEnd(referenceStartSec, parseOptionalSecond(parts[3]));
      const storagePath = parts[4] ?? "";
      if (!referenceUrl && !storagePath) {
        errors.push(`${index + 1}行目: 参考URLか公開用URLが必要です`);
        return;
      }

      const key = videoRowKey(trick.id, storagePath, referenceUrl, referenceStartSec);
      const existing = existingByKey.get(key);
      parsedVideos.push({
        id: existing?.id ?? `draft-video-${trick.id}-${index}-${Date.now()}`,
        trickId: trick.id,
        type: "video",
        storagePath,
        referenceUrl: referenceUrl || undefined,
        referenceStartSec,
        referenceEndSec,
        rightsNote: parts.slice(7).join(" | ") || undefined,
        duration: existing?.duration,
        credit: parts[6] || undefined,
        consentChecked: parseConsent(parts[5])
      });
    });

  return {
    mediaAssets: [...keptNonVideo, ...parsedVideos],
    videoCount: parsedVideos.length,
    errors
  };
}

function normalizeVideoTrickKey(value: string) {
  return value.trim().toLowerCase();
}

function videoRowKey(trickId: string, storagePath: string, referenceUrl: string, referenceStartSec?: number) {
  return [trickId, storagePath, referenceUrl, referenceStartSec ?? ""].join("\u0000");
}

function parseOptionalSecond(value: string | undefined) {
  return parseTimecodeToSeconds(value);
}

function normalizeReferenceEnd(start: number | undefined, end: number | undefined) {
  if (start !== undefined && end !== undefined && end < start) return start;
  return end;
}

function parseConsent(value: string | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  return ["ok", "true", "1", "yes", "y", "済", "確認済", "公開ok", "公開"].includes(normalized);
}

function isLearningRelation(relation: TrickRelation) {
  return relation.type === "prerequisite" || relation.type === "progression";
}
